import { z } from "zod";
import type { Action, Circle, Ctx, Db, ID, RoleSlot } from "./types";
import { canManageAction, isCircleMember } from "./access";
import { promoteFromWaitlist } from "./join";
import {
  audit,
  campaignCode,
  clampText,
  DAY,
  fail,
  isSafeHttpUrl,
  newId,
  notify,
  requireOperator,
  requireUser,
  slugify,
} from "./util";

const CIRCLE_EMOJI = ["🧵", "🍞", "🎸", "🪴", "🎨", "🔧", "🥟", "📚", "🧶", "🪡"];

export const roleInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(40),
  emoji: z.string().trim().max(8).default("✨"),
  description: z.string().trim().max(140).default(""),
  capacity: z.coerce.number().int().min(1).max(10).default(1),
});

export const actionInput = z.object({
  title: z.string().trim().min(3, "Give it a short title").max(80),
  summary: z.string().trim().max(240).default(""),
  whatToExpect: z.string().trim().max(1200).default(""),
  category: z.string().trim().max(30).default("making"),
  startsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Pick a date and time"),
  durationMins: z.coerce.number().int().min(15).max(12 * 60),
  effort: z.enum(["easy", "some", "stretch"]),
  costLabel: z.string().trim().max(60).default("Free"),
  accessibility: z.string().trim().max(400).default(""),
  areaLabel: z.string().trim().max(60).default(""),
  venueName: z.string().trim().max(80).default(""),
  venueAddress: z.string().trim().max(200).default(""),
  venueNotes: z.string().trim().max(400).default(""),
  capacity: z.coerce.number().int().min(2, "At least 2 people").max(60, "Keep it small: 60 max"),
  visibility: z.enum(["public", "invite"]),
  allowAdaptation: z.coerce.boolean().default(false),
  sourceUrl: z.string().trim().max(400).optional(),
  sourceCredit: z.string().trim().max(80).optional(),
  roles: z.array(roleInput).max(8).default([]),
  lessons: z.array(z.string().trim().max(200)).max(10).default([]),
});

export type ActionInput = z.input<typeof actionInput>;

function getAction(db: Db, id: ID): Action {
  const a = db.actions.find((x) => x.id === id);
  if (!a) fail("not_found", "That plan doesn't exist.");
  return a;
}

export function findAction(db: Db, id: ID): Action {
  return getAction(db, id);
}

export function createDraft(
  db: Db,
  ctx: Ctx,
  opts: { templateId?: ID; title?: string; sourceUrl?: string; sourceCredit?: string; circleId?: ID },
): Action {
  const user = requireUser(db, ctx);
  const template = opts.templateId ? db.templates.find((t) => t.id === opts.templateId) : undefined;
  if (opts.templateId && !template) fail("not_found", "Template not found.");
  if (opts.sourceUrl && !isSafeHttpUrl(opts.sourceUrl)) fail("invalid", "That link doesn't look right.");
  if (opts.circleId && !isCircleMember(db, opts.circleId, user.id)) {
    fail("forbidden", "Only members can plan for this Circle.");
  }

  const start = new Date(ctx.now.getTime() + 14 * DAY);
  start.setHours(14, 0, 0, 0);

  const action: Action = {
    id: newId("act"),
    slug: slugify(template?.title ?? opts.title ?? "new plan"),
    circleId: opts.circleId,
    hostId: user.id,
    status: "draft",
    title: clampText(template?.title ?? opts.title ?? "", 80),
    summary: template?.summary ?? "",
    whatToExpect: template?.whatToExpect ?? "",
    category: template?.category ?? "making",
    durationMins: template?.durationMins ?? 120,
    effort: template?.effort ?? "easy",
    costLabel: template?.costLabel ?? "Free",
    accessibility: template?.accessibility ?? "",
    roles: (template?.roles ?? []).map((r) => ({ ...r, id: newId("role") })),
    lessons: template?.lessons ? [...template.lessons] : [],
    startsAt: start.toISOString(),
    areaLabel: "",
    venueName: "",
    venueAddress: "",
    venueNotes: "",
    capacity: 8,
    visibility: "public",
    allowAdaptation: true,
    sourceUrl: opts.sourceUrl,
    sourceCredit: opts.sourceCredit ? clampText(opts.sourceCredit, 80) : undefined,
    createdAt: ctx.now.toISOString(),
    campaignCode: campaignCode(),
    founderPrompted: false,
  };
  db.actions.push(action);
  audit(db, ctx, "action.draft_created", "action", action.id, { templateId: opts.templateId });
  return action;
}

function normaliseRoles(existing: RoleSlot[], input: z.output<typeof roleInput>[]): RoleSlot[] {
  return input.map((r) => {
    const keep = r.id ? existing.find((e) => e.id === r.id) : undefined;
    return {
      id: keep?.id ?? newId("role"),
      name: r.name,
      emoji: r.emoji || "✨",
      description: r.description,
      capacity: r.capacity,
    };
  });
}

export function updateAction(db: Db, ctx: Ctx, id: ID, raw: ActionInput): Action {
  const user = requireUser(db, ctx);
  const action = getAction(db, id);
  if (!canManageAction(db, action, user.id)) fail("forbidden", "Only the host can edit this plan.");
  if (action.status === "cancelled" || action.status === "completed") {
    fail("conflict", "This plan is finished. Repeat it to make a new one.");
  }
  const parsed = actionInput.safeParse(raw);
  if (!parsed.success) fail("invalid", parsed.error.issues[0]?.message ?? "Check the details.");
  const input = parsed.data;
  if (input.sourceUrl && !isSafeHttpUrl(input.sourceUrl)) fail("invalid", "The inspiration link must start with https://");

  const confirmed = db.rsvps.filter((r) => r.actionId === id && r.status === "confirmed").length;
  if (input.capacity < confirmed) {
    fail("conflict", `${confirmed} people are already confirmed — capacity can't go below that.`);
  }

  const before = { startsAt: action.startsAt, venueAddress: action.venueAddress, venueName: action.venueName };
  Object.assign(action, {
    ...input,
    sourceUrl: input.sourceUrl || undefined,
    sourceCredit: input.sourceCredit || undefined,
    startsAt: new Date(input.startsAt).toISOString(),
    roles: normaliseRoles(action.roles, input.roles),
    lessons: input.lessons.filter(Boolean),
  });

  if (action.status === "published") {
    const changed =
      before.startsAt !== action.startsAt ||
      before.venueAddress !== action.venueAddress ||
      before.venueName !== action.venueName;
    if (changed) {
      for (const r of db.rsvps.filter((r) => r.actionId === id && r.status !== "cancelled")) {
        notify(db, ctx, r.userId, `“${action.title}” has a new time or place. Check the details.`, `/a/${action.slug}`);
      }
    }
    // Capacity may have grown: let waitlisted people in.
    promoteFromWaitlist(db, ctx, action);
  }
  audit(db, ctx, "action.updated", "action", id);
  return action;
}

export function publishReadiness(action: Action, now: Date): string[] {
  const problems: string[] = [];
  if (action.title.trim().length < 3) problems.push("Add a title.");
  if (!action.summary.trim()) problems.push("Add a one-line summary.");
  if (new Date(action.startsAt).getTime() <= now.getTime()) problems.push("Pick a date in the future.");
  if (!action.areaLabel.trim()) problems.push("Add the public area (e.g. a neighbourhood).");
  if (!action.venueName.trim()) problems.push("Name the public or partner venue.");
  if (!action.venueAddress.trim()) problems.push("Add the exact address (kept private).");
  if (!action.accessibility.trim()) problems.push("Say something about accessibility.");
  return problems;
}

function ensureCircle(db: Db, ctx: Ctx, action: Action): Circle {
  if (action.circleId) {
    const c = db.circles.find((x) => x.id === action.circleId);
    if (c) return c;
  }
  const circle: Circle = {
    id: newId("cir"),
    name: action.title,
    emoji: CIRCLE_EMOJI[db.circles.length % CIRCLE_EMOJI.length],
    createdAt: ctx.now.toISOString(),
    createdBy: action.hostId,
  };
  db.circles.push(circle);
  action.circleId = circle.id;
  db.memberships.push({ circleId: circle.id, userId: action.hostId, role: "host", joinedAt: ctx.now.toISOString() });
  audit(db, ctx, "circle.created", "circle", circle.id);
  return circle;
}

/** A member of an established Circle repeating that Circle's own format doesn't need fresh review. */
function isEstablishedRepeat(db: Db, action: Action): boolean {
  if (!action.circleId) return false;
  if (!isCircleMember(db, action.circleId, action.hostId)) return false;
  return db.actions.some(
    (a) => a.circleId === action.circleId && a.id !== action.id && (a.status === "completed" || a.status === "published"),
  );
}

export type PublishOutcome = "published" | "in_review";

export function publishAction(db: Db, ctx: Ctx, id: ID): PublishOutcome {
  const user = requireUser(db, ctx);
  const action = getAction(db, id);
  if (action.hostId !== user.id) fail("forbidden", "Only the host can publish this plan.");
  if (action.status !== "draft") fail("conflict", "This plan isn't a draft.");
  const problems = publishReadiness(action, ctx.now);
  if (problems.length) fail("invalid", problems[0]);
  if (user.hostStatus === "suspended") fail("forbidden", "Hosting is paused on your account. You can appeal from your profile.");

  if (user.hostStatus === "approved" || isEstablishedRepeat(db, action)) {
    goLive(db, ctx, action);
    return "published";
  }
  action.status = "in_review";
  if (user.hostStatus === "none") user.hostStatus = "pending";
  audit(db, ctx, "action.submitted_for_review", "action", id);
  for (const op of db.users.filter((u) => u.isOperator)) {
    notify(db, ctx, op.id, `New plan to review: “${action.title}”`, `/ops`);
  }
  return "in_review";
}

function goLive(db: Db, ctx: Ctx, action: Action) {
  ensureCircle(db, ctx, action);
  action.status = "published";
  action.publishedAt = ctx.now.toISOString();
  action.reviewNote = undefined;
  audit(db, ctx, "action.published", "action", action.id);
}

export function reviewAction(db: Db, ctx: Ctx, id: ID, decision: "approve" | "return", note: string): void {
  requireOperator(db, ctx);
  const action = getAction(db, id);
  if (action.status !== "in_review") fail("conflict", "Nothing to review.");
  const host = db.users.find((u) => u.id === action.hostId);
  if (decision === "approve") {
    if (host && host.hostStatus !== "suspended") host.hostStatus = "approved";
    goLive(db, ctx, action);
    notify(db, ctx, action.hostId, `Your plan “${action.title}” is live. Time to share it!`, `/plan/${action.id}/manage`);
  } else {
    action.status = "draft";
    action.reviewNote = clampText(note, 400) || "Please check the details and resubmit.";
    notify(db, ctx, action.hostId, `Your plan “${action.title}” needs a small change.`, `/plan/${action.id}/edit`);
  }
  audit(db, ctx, `action.review_${decision}`, "action", id, { note });
}

export function cancelAction(db: Db, ctx: Ctx, id: ID, reason: string): void {
  const user = requireUser(db, ctx);
  const action = getAction(db, id);
  if (!canManageAction(db, action, user.id)) fail("forbidden", "Only the host can cancel.");
  if (action.status === "cancelled" || action.status === "completed") fail("conflict", "Already finished.");
  action.status = "cancelled";
  action.cancelledAt = ctx.now.toISOString();
  action.cancelReason = clampText(reason, 300);
  for (const r of db.rsvps.filter((r) => r.actionId === id && r.status !== "cancelled")) {
    notify(db, ctx, r.userId, `“${action.title}” was cancelled by the host.`, `/a/${action.slug}`);
  }
  audit(db, ctx, "action.cancelled", "action", id, { reason });
}

export function completeAction(db: Db, ctx: Ctx, id: ID): void {
  const user = requireUser(db, ctx);
  const action = getAction(db, id);
  if (!canManageAction(db, action, user.id)) fail("forbidden", "Only the host can wrap up.");
  if (action.status !== "published") fail("conflict", "Only live plans can be wrapped up.");
  if (new Date(action.startsAt).getTime() > ctx.now.getTime()) fail("conflict", "It hasn't happened yet!");
  action.status = "completed";
  action.completedAt = ctx.now.toISOString();
  for (const r of db.rsvps.filter((r) => r.actionId === id && r.status === "confirmed")) {
    if (r.userId !== user.id) {
      notify(db, ctx, r.userId, `How was “${action.title}”? Share a quick private note.`, `/a/${action.slug}`);
    }
  }
  audit(db, ctx, "action.completed", "action", id);
}
