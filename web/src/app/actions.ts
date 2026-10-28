"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Channel, Ctx, Db, HostStatus, Report } from "@/lib/domain/types";
import { DomainError, newId, clampText } from "@/lib/domain/util";
import { getStore, resetDemo } from "@/lib/store";
import { clearSession, getCtx, setSession } from "@/lib/auth/session";
import { IS_DEMO } from "@/lib/config";
import * as A from "@/lib/domain/actions";
import * as J from "@/lib/domain/join";
import * as C from "@/lib/domain/circles";
import * as O from "@/lib/domain/ops";
import { adaptAction } from "@/lib/domain/adapt";
import { parseChannel, recordCampaignEvent } from "@/lib/domain/share";
import { SAMPLE_PERSONAS } from "@/lib/store/seed";

export type Result = { ok: true; message?: string } | { ok: false; error: string } | null;

async function mutate<T>(fn: (db: Db, ctx: Ctx) => T): Promise<T> {
  const ctx = await getCtx();
  const out = await getStore().transact((db) => fn(db, ctx));
  revalidatePath("/", "layout");
  return out;
}

async function flash(text: string, tone: "ok" | "error" = "ok") {
  (await cookies()).set("hd_flash", JSON.stringify({ text, tone }), { path: "/", maxAge: 30, sameSite: "lax" });
}

function errorText(e: unknown): string {
  if (e instanceof DomainError) return e.message;
  console.error(e);
  return "Something went wrong. Please try again.";
}

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/me";
}

/** For forms that redirect: run, flash the outcome, then go somewhere. */
async function act(fn: (db: Db, ctx: Ctx) => unknown, ok: string | null, back: string) {
  try {
    await mutate(fn);
    if (ok) await flash(ok);
  } catch (e) {
    if (e instanceof DomainError && e.code === "unauthenticated") redirect(`/signin?next=${encodeURIComponent(back)}`);
    await flash(errorText(e), "error");
  }
  redirect(back);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(_: Result, fd: FormData): Promise<Result> {
  const name = clampText(str(fd, "name"), 40);
  const email = clampText(str(fd, "email"), 120).toLowerCase();
  const next = safeNext(str(fd, "next") || "/me");
  if (!name) return { ok: false, error: "What should people call you?" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That email doesn't look right." };
  if (fd.get("adult") !== "on") return { ok: false, error: "The pilot is for adults (18+) for now." };
  const id = await getStore().transact((db) => {
    const existing = db.users.find((u) => u.email === email);
    if (existing) return existing.id;
    const id = newId("u");
    db.users.push({
      id,
      name,
      email,
      createdAt: new Date().toISOString(),
      adultConfirmed: true,
      hostStatus: "none",
      isOperator: false,
      notify: { email: true, reminders: true, circleMessages: true },
    });
    return id;
  });
  await setSession(id);
  redirect(next);
}

export async function signInAsSample(fd: FormData) {
  if (!IS_DEMO) redirect("/signin");
  const id = str(fd, "persona");
  if (!SAMPLE_PERSONAS.some((p) => p.id === id)) redirect("/signin");
  await setSession(id);
  const name = SAMPLE_PERSONAS.find((p) => p.id === id)!.label;
  await flash(`You're now ${name} (sample person)`);
  redirect(safeNext(str(fd, "next") || "/me"));
}

export async function signOut() {
  await clearSession();
  redirect("/");
}

// ── Joining ──────────────────────────────────────────────────────────────────

export async function join(_: Result, fd: FormData): Promise<Result> {
  const actionId = str(fd, "actionId");
  const slug = str(fd, "slug");
  const inviteToken = str(fd, "i") || undefined;
  const ctx = await getCtx();
  if (!ctx.userId) {
    const back = `/a/${slug}?${new URLSearchParams({ ...(inviteToken ? { i: inviteToken } : {}), c: str(fd, "c"), ch: str(fd, "ch"), autojoin: "1" })}`;
    redirect(`/signin?next=${encodeURIComponent(back)}`);
  }
  let status: string;
  try {
    const r = await mutate((db, ctx) =>
      J.joinAction(db, ctx, actionId, {
        inviteToken,
        roleSlotId: str(fd, "roleSlotId") || undefined,
        campaignCode: str(fd, "c") || undefined,
        channel: str(fd, "c") ? parseChannel(str(fd, "ch")) : undefined,
      }),
    );
    status = r.status;
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
  redirect(`/a/${slug}?${new URLSearchParams({ joined: status, ...(inviteToken ? { i: inviteToken } : {}) })}`);
}

export async function leave(fd: FormData) {
  await act((db, ctx) => J.leaveAction(db, ctx, str(fd, "actionId")), "You've given up your place — thanks for letting people know.", `/a/${str(fd, "slug")}`);
}

export async function pickRole(fd: FormData) {
  const role = str(fd, "roleSlotId");
  await act(
    (db, ctx) => J.chooseRole(db, ctx, str(fd, "actionId"), role || null),
    role ? "Thank you for pitching in! ✨" : "Role cleared.",
    `/a/${str(fd, "slug")}`,
  );
}

export async function reportAttendance(fd: FormData) {
  await act((db, ctx) => J.reportAttendance(db, ctx, str(fd, "actionId"), str(fd, "attended") === "yes"), "Noted — thanks!", `/a/${str(fd, "slug")}`);
}

// ── Hosting ──────────────────────────────────────────────────────────────────

export async function startPlan(fd: FormData) {
  let id = "";
  try {
    const a = await mutate((db, ctx) =>
      A.createDraft(db, ctx, {
        templateId: str(fd, "templateId") || undefined,
        title: str(fd, "title") || undefined,
        sourceUrl: str(fd, "sourceUrl") || undefined,
        sourceCredit: str(fd, "sourceCredit") || undefined,
        circleId: str(fd, "circleId") || undefined,
      }),
    );
    id = a.id;
  } catch (e) {
    if (e instanceof DomainError && e.code === "unauthenticated") redirect("/signin?next=/plan/new");
    await flash(errorText(e), "error");
    redirect("/plan/new");
  }
  redirect(`/plan/${id}/edit`);
}

function readActionForm(fd: FormData): A.ActionInput {
  const names = fd.getAll("role_name").map(String);
  const roles = names
    .map((name, i) => ({
      id: String(fd.getAll("role_id")[i] ?? "") || undefined,
      name,
      emoji: String(fd.getAll("role_emoji")[i] ?? "✨"),
      description: String(fd.getAll("role_desc")[i] ?? ""),
      capacity: Number(fd.getAll("role_cap")[i] ?? 1),
    }))
    .filter((r) => r.name.trim());
  const date = str(fd, "date");
  const time = str(fd, "time") || "14:00";
  const tz = Number(str(fd, "tzOffset") || "0");
  // Browser sends its timezone offset so "2pm" means 2pm where the host is.
  const startsAt = date ? new Date(Date.parse(`${date}T${time}:00Z`) + tz * 60_000).toISOString() : "";
  return {
    title: str(fd, "title"),
    summary: str(fd, "summary"),
    whatToExpect: str(fd, "whatToExpect"),
    category: str(fd, "category") || "making",
    startsAt,
    durationMins: Number(str(fd, "durationMins") || 120),
    effort: (str(fd, "effort") || "easy") as "easy",
    costLabel: str(fd, "costLabel") || "Free",
    accessibility: str(fd, "accessibility"),
    areaLabel: str(fd, "areaLabel"),
    venueName: str(fd, "venueName"),
    venueAddress: str(fd, "venueAddress"),
    venueNotes: str(fd, "venueNotes"),
    capacity: Number(str(fd, "capacity") || 8),
    visibility: str(fd, "visibility") === "invite" ? "invite" : "public",
    allowAdaptation: fd.get("allowAdaptation") === "on",
    sourceUrl: str(fd, "sourceUrl") || undefined,
    sourceCredit: str(fd, "sourceCredit") || undefined,
    roles,
    lessons: str(fd, "lessons").split("\n").map((l) => l.trim()).filter(Boolean),
  };
}

export async function savePlan(_: Result, fd: FormData): Promise<Result> {
  const id = str(fd, "id");
  const intent = str(fd, "intent");
  let outcome: A.PublishOutcome | "saved" = "saved";
  try {
    outcome = await mutate((db, ctx) => {
      A.updateAction(db, ctx, id, readActionForm(fd));
      if (intent === "publish") return A.publishAction(db, ctx, id);
      return "saved" as const;
    });
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
  if (outcome === "published") {
    await flash("It's live! Now let's tell people 🎉");
    redirect(`/plan/${id}/share?fresh=1`);
  }
  if (outcome === "in_review") {
    await flash("Sent for a quick pilot review. We'll let you know soon.");
    redirect(`/plan/${id}/manage`);
  }
  if (intent === "preview") redirect(`/plan/${id}/edit?preview=1`);
  return { ok: true, message: "Saved ✓" };
}

export async function cancelPlan(fd: FormData) {
  await act((db, ctx) => A.cancelAction(db, ctx, str(fd, "actionId"), str(fd, "reason")), "Cancelled. Everyone has been told.", `/plan/${str(fd, "actionId")}/manage`);
}

export async function completePlan(fd: FormData) {
  await act((db, ctx) => A.completeAction(db, ctx, str(fd, "actionId")), "Wrapped up! 🌱 Your Circle's garden just grew.", `/plan/${str(fd, "actionId")}/wrap`);
}

export async function assignRole(fd: FormData) {
  await act((db, ctx) => J.hostAssignRole(db, ctx, str(fd, "rsvpId"), str(fd, "roleSlotId") || null), "Role updated.", `/plan/${str(fd, "actionId")}/manage`);
}

export async function markAttendance(fd: FormData) {
  await act((db, ctx) => J.hostMarkAttendance(db, ctx, str(fd, "rsvpId"), str(fd, "attended") === "yes"), null, `/plan/${str(fd, "actionId")}/wrap`);
}

export async function makeInvite(fd: FormData) {
  await act(
    (db, ctx) => J.createInvitation(db, ctx, str(fd, "actionId"), { days: Number(str(fd, "days") || 7), maxUses: Number(str(fd, "maxUses") || 20) }),
    "New invitation link ready.",
    `/plan/${str(fd, "actionId")}/manage`,
  );
}

export async function revokeInvite(fd: FormData) {
  await act((db, ctx) => J.revokeInvitation(db, ctx, str(fd, "invitationId")), "Invitation link turned off.", `/plan/${str(fd, "actionId")}/manage`);
}

// ── Continue ─────────────────────────────────────────────────────────────────

export async function giveFeedback(_: Result, fd: FormData): Promise<Result> {
  try {
    await mutate((db, ctx) =>
      C.submitFeedback(db, ctx, str(fd, "actionId"), {
        worthIt: Number(str(fd, "worthIt") || 3),
        wouldReturn: str(fd, "wouldReturn") === "yes",
        feltWelcome: str(fd, "feltWelcome") === "yes",
        privateNote: str(fd, "privateNote"),
      }),
    );
    return { ok: true, message: "Thank you. That stays private 💛" };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

export async function thank(fd: FormData) {
  const back = str(fd, "back") || "/me";
  await act((db, ctx) => C.sendAppreciation(db, ctx, str(fd, "actionId"), str(fd, "toId"), str(fd, "message")), "Thank-you sent 💌", safeNext(back));
}

export async function writeStory(fd: FormData) {
  const back = safeNext(str(fd, "back") || "/me");
  await act(
    (db, ctx) =>
      C.recordStory(db, ctx, str(fd, "actionId"), {
        whatHappened: str(fd, "whatHappened"),
        learned: str(fd, "learned"),
        next: str(fd, "next"),
        lessons: str(fd, "lessons").split("\n").map((l) => l.trim()).filter(Boolean),
      }),
    "Story saved to your Circle 📖 (private)",
    back,
  );
}

export async function askToShareStory(fd: FormData) {
  await act((db, ctx) => C.requestPublicStory(db, ctx, str(fd, "storyId")), "We've asked everyone who took part. It goes public only if they all say yes.", `/c/${str(fd, "circleId")}`);
}

export async function storyConsent(fd: FormData) {
  await act((db, ctx) => C.decideConsent(db, ctx, str(fd, "storyId"), str(fd, "granted") === "yes"), "Thanks — your choice is saved.", `/c/${str(fd, "circleId")}`);
}

export async function withdrawStory(fd: FormData) {
  await act((db, ctx) => C.withdrawStory(db, ctx, str(fd, "storyId")), "Story is private again.", `/c/${str(fd, "circleId")}`);
}

export async function repeatPlan(fd: FormData) {
  let id = "";
  try {
    const date = str(fd, "date");
    const a = await mutate((db, ctx) => C.repeatAction(db, ctx, str(fd, "actionId"), date ? `${date}T14:00:00` : undefined));
    id = a.id;
  } catch (e) {
    await flash(errorText(e), "error");
    redirect(`/c/${str(fd, "circleId")}`);
  }
  await flash("Here's the next one, with your lessons carried over ✨");
  redirect(`/plan/${id}/edit`);
}

export async function sendMessage(fd: FormData) {
  await act((db, ctx) => C.postMessage(db, ctx, str(fd, "circleId"), str(fd, "body")), null, `/c/${str(fd, "circleId")}#chat`);
}

export async function leaveCircle(fd: FormData) {
  await act((db, ctx) => C.leaveCircle(db, ctx, str(fd, "circleId")), "You've left the Circle. You're always welcome back.", "/me");
}

// ── Spread ───────────────────────────────────────────────────────────────────

export async function adapt(fd: FormData) {
  let id = "";
  try {
    id = (await mutate((db, ctx) => adaptAction(db, ctx, str(fd, "actionId")))).id;
  } catch (e) {
    if (e instanceof DomainError && e.code === "unauthenticated") redirect(`/signin?next=/adapt/${str(fd, "slug")}`);
    await flash(errorText(e), "error");
    redirect(`/a/${str(fd, "slug")}`);
  }
  await flash("Copied the format — now make it yours 🌱");
  redirect(`/plan/${id}/edit`);
}

export async function trackShare(actionId: string, kind: "share_opened" | "image_downloaded" | "caption_copied" | "link_copied", channel: Channel) {
  try {
    await mutate((db, ctx) => recordCampaignEvent(db, ctx, actionId, kind, channel));
  } catch {
    /* measurement must never break sharing */
  }
}

export async function trackVisit(actionId: string, code: string, channel: string) {
  try {
    const ctx = await getCtx();
    await getStore().transact((db) => recordCampaignEvent(db, ctx, actionId, "visit", parseChannel(channel), code));
  } catch {
    /* ignore */
  }
}

// ── Safety & account ─────────────────────────────────────────────────────────

export async function report(_: Result, fd: FormData): Promise<Result> {
  try {
    await mutate((db, ctx) =>
      O.fileReport(db, ctx, {
        targetType: str(fd, "targetType") as Report["targetType"],
        targetId: str(fd, "targetId"),
        reason: str(fd, "reason"),
        details: str(fd, "details"),
      }),
    );
    return { ok: true, message: "Thank you. A person on the pilot team will look at this." };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

export async function appeal(_: Result, fd: FormData): Promise<Result> {
  try {
    await mutate((db, ctx) => O.fileAppeal(db, ctx, str(fd, "subject"), str(fd, "details")));
    return { ok: true, message: "Appeal received. We'll reply in your notifications." };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

export async function savePrefs(fd: FormData) {
  await act(
    (db, ctx) => O.updateNotifyPrefs(db, ctx, { email: fd.get("email") === "on", reminders: fd.get("reminders") === "on", circleMessages: fd.get("circleMessages") === "on" }),
    "Notification settings saved.",
    "/me#settings",
  );
}

export async function requestDeletion(fd: FormData) {
  if (str(fd, "confirm") !== "DELETE") {
    await flash("Type DELETE to confirm.", "error");
    redirect("/me#settings");
  }
  await act((db, ctx) => O.requestDeletion(db, ctx), "Deletion requested. An operator will complete it within 30 days.", "/me#settings");
}

export async function markNotificationsRead() {
  await mutate((db, ctx) => {
    for (const n of db.notifications) if (n.userId === ctx.userId && !n.readAt) n.readAt = ctx.now.toISOString();
  });
}

// ── Operator ─────────────────────────────────────────────────────────────────

export async function opsReview(fd: FormData) {
  await act((db, ctx) => A.reviewAction(db, ctx, str(fd, "actionId"), str(fd, "decision") === "approve" ? "approve" : "return", str(fd, "note")), "Review saved.", "/ops");
}

export async function opsResolveReport(fd: FormData) {
  await act((db, ctx) => O.resolveReport(db, ctx, str(fd, "reportId"), str(fd, "status") === "dismissed" ? "dismissed" : "resolved", str(fd, "resolution")), "Report updated.", "/ops#reports");
}

export async function opsAppeal(fd: FormData) {
  await act((db, ctx) => O.decideAppeal(db, ctx, str(fd, "appealId"), str(fd, "status") === "upheld" ? "upheld" : "denied", str(fd, "response")), "Appeal answered.", "/ops#appeals");
}

export async function opsDeletion(fd: FormData) {
  await act((db, ctx) => O.processDeletion(db, ctx, str(fd, "userId")), "Account deleted and records anonymised.", "/ops#accounts");
}

export async function opsHostStatus(fd: FormData) {
  await act((db, ctx) => O.setHostStatus(db, ctx, str(fd, "userId"), str(fd, "status") as HostStatus), "Host status updated.", "/ops#accounts");
}

export async function opsFounderPrompted(fd: FormData) {
  await act((db, ctx) => O.setFounderPrompted(db, ctx, str(fd, "actionId"), str(fd, "value") === "yes"), null, "/ops#actions");
}

export async function opsLogSupport(fd: FormData) {
  await act((db, ctx) => O.logSupport(db, ctx, Number(str(fd, "minutes")), str(fd, "note"), str(fd, "circleId")), "Support time logged.", "/ops#support");
}

export async function opsRemoveMessage(fd: FormData) {
  await act((db, ctx) => O.removeMessage(db, ctx, str(fd, "messageId")), "Message removed.", "/ops#reports");
}

export async function demoReset() {
  if (!IS_DEMO) return;
  resetDemo();
  await clearSession();
  await flash("Demo reset to fresh sample data.");
  redirect("/");
}
