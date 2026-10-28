import type { Appeal, Channel, Ctx, Db, HostStatus, ID, Report } from "./types";
import { audit, clampText, DAY, fail, newId, notify, requireOperator, requireUser } from "./util";

export function fileReport(
  db: Db,
  ctx: Ctx,
  input: { targetType: Report["targetType"]; targetId: ID; reason: string; details: string },
): Report {
  const user = requireUser(db, ctx);
  const reason = clampText(input.reason, 60);
  if (!reason) fail("invalid", "Choose a reason.");
  const r: Report = {
    id: newId("rep"),
    reporterId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
    reason,
    details: clampText(input.details, 2000),
    status: "open",
    createdAt: ctx.now.toISOString(),
  };
  db.reports.push(r);
  for (const op of db.users.filter((u) => u.isOperator)) notify(db, ctx, op.id, `New report: ${reason}`, "/ops");
  audit(db, ctx, "report.filed", input.targetType, input.targetId);
  return r;
}

export function resolveReport(db: Db, ctx: Ctx, id: ID, status: "resolved" | "dismissed", resolution: string) {
  requireOperator(db, ctx);
  const r = db.reports.find((x) => x.id === id);
  if (!r) fail("not_found", "Not found.");
  r.status = status;
  r.resolution = clampText(resolution, 1000);
  r.resolvedAt = ctx.now.toISOString();
  notify(db, ctx, r.reporterId, `Thanks for your report — we've looked into it (${status}).`, "/me");
  audit(db, ctx, `report.${status}`, "report", id, { resolution });
}

export function removeMessage(db: Db, ctx: Ctx, messageId: ID) {
  requireOperator(db, ctx);
  const m = db.messages.find((x) => x.id === messageId);
  if (!m) fail("not_found", "Not found.");
  m.body = "[removed by an operator]";
  audit(db, ctx, "message.removed", "message", messageId);
}

export function setHostStatus(db: Db, ctx: Ctx, userId: ID, status: HostStatus) {
  requireOperator(db, ctx);
  const u = db.users.find((x) => x.id === userId);
  if (!u) fail("not_found", "Not found.");
  u.hostStatus = status;
  notify(db, ctx, userId, status === "approved" ? "You're a reviewed host now 🎉" : `Your hosting status is now: ${status}.`, "/me");
  audit(db, ctx, "user.host_status", "user", userId, { status });
}

export function setFounderPrompted(db: Db, ctx: Ctx, actionId: ID, value: boolean) {
  requireOperator(db, ctx);
  const a = db.actions.find((x) => x.id === actionId);
  if (!a) fail("not_found", "Not found.");
  a.founderPrompted = value;
  audit(db, ctx, "action.founder_prompted", "action", actionId, { value });
}

export function logSupport(db: Db, ctx: Ctx, minutes: number, note: string, circleId?: ID) {
  const op = requireOperator(db, ctx);
  const mins = Math.round(Number(minutes));
  if (!(mins > 0 && mins <= 600)) fail("invalid", "Minutes must be between 1 and 600.");
  db.supportLogs.push({
    id: newId("sup"),
    operatorId: op.id,
    minutes: mins,
    note: clampText(note, 500),
    circleId: circleId || undefined,
    createdAt: ctx.now.toISOString(),
  });
}

export function fileAppeal(db: Db, ctx: Ctx, subject: string, details: string): Appeal {
  // Suspended or deletion-pending users may still appeal, so look up directly.
  if (!ctx.userId) fail("unauthenticated", "Please sign in first.");
  const user = db.users.find((u) => u.id === ctx.userId);
  if (!user) fail("unauthenticated", "Please sign in again.");
  const a: Appeal = {
    id: newId("apl"),
    userId: user.id,
    subject: clampText(subject, 120) || "Appeal",
    details: clampText(details, 2000),
    status: "open",
    createdAt: ctx.now.toISOString(),
  };
  db.appeals.push(a);
  audit(db, ctx, "appeal.filed", "appeal", a.id);
  return a;
}

export function decideAppeal(db: Db, ctx: Ctx, id: ID, status: "upheld" | "denied", response: string) {
  requireOperator(db, ctx);
  const a = db.appeals.find((x) => x.id === id);
  if (!a) fail("not_found", "Not found.");
  a.status = status;
  a.response = clampText(response, 1000);
  notify(db, ctx, a.userId, `Your appeal was ${status}.`, "/me");
  audit(db, ctx, `appeal.${status}`, "appeal", id);
}

export function updateNotifyPrefs(db: Db, ctx: Ctx, prefs: { email: boolean; reminders: boolean; circleMessages: boolean }) {
  const user = requireUser(db, ctx);
  user.notify = { email: !!prefs.email, reminders: !!prefs.reminders, circleMessages: !!prefs.circleMessages };
}

/** Everything that is the user's own data. Other people's private details are excluded. */
export function exportAccount(db: Db, ctx: Ctx) {
  if (!ctx.userId) fail("unauthenticated", "Please sign in first.");
  const user = db.users.find((u) => u.id === ctx.userId);
  if (!user) fail("unauthenticated", "Please sign in again.");
  const id = user.id;
  audit(db, ctx, "account.exported", "user", id);
  return {
    exportedAt: ctx.now.toISOString(),
    profile: user,
    memberships: db.memberships.filter((m) => m.userId === id),
    rsvps: db.rsvps.filter((r) => r.userId === id),
    hostedActions: db.actions.filter((a) => a.hostId === id),
    messages: db.messages.filter((m) => m.userId === id),
    feedbackGiven: db.feedback.filter((f) => f.userId === id),
    storiesWritten: db.stories.filter((s) => s.authorId === id),
    appreciationsGiven: db.appreciations.filter((a) => a.fromId === id),
    appreciationsReceived: db.appreciations.filter((a) => a.toId === id).map(({ fromId: _f, ...rest }) => rest),
    reportsFiled: db.reports.filter((r) => r.reporterId === id),
    appeals: db.appeals.filter((a) => a.userId === id),
    notifications: db.notifications.filter((n) => n.userId === id),
  };
}

export function requestDeletion(db: Db, ctx: Ctx) {
  const user = requireUser(db, ctx);
  user.deletionRequestedAt = ctx.now.toISOString();
  for (const op of db.users.filter((u) => u.isOperator)) notify(db, ctx, op.id, "An account deletion was requested.", "/ops");
  audit(db, ctx, "account.deletion_requested", "user", user.id);
}

/** Operator completes a deletion: personal data removed, shared records anonymised. */
export function processDeletion(db: Db, ctx: Ctx, userId: ID) {
  requireOperator(db, ctx);
  const u = db.users.find((x) => x.id === userId);
  if (!u?.deletionRequestedAt) fail("conflict", "No deletion request for this account.");
  u.name = "Former member";
  u.email = `deleted+${u.id}@invalid`;
  u.bio = undefined;
  u.hostStatus = "suspended";
  for (const m of db.messages.filter((m) => m.userId === userId)) m.body = "[deleted]";
  db.feedback = db.feedback.filter((f) => f.userId !== userId);
  db.notifications = db.notifications.filter((n) => n.userId !== userId);
  for (const m of db.memberships.filter((m) => m.userId === userId && !m.leftAt)) m.leftAt = ctx.now.toISOString();
  for (const r of db.rsvps.filter((r) => r.userId === userId && r.status !== "cancelled")) {
    r.status = "cancelled";
    r.cancelledAt = ctx.now.toISOString();
  }
  for (const s of db.stories) {
    if (s.authorId === userId || userId in s.consents) s.visibility = "private";
  }
  audit(db, ctx, "account.deleted", "user", userId);
}

export interface PilotMetrics {
  includesSample: boolean;
  circles: number;
  matureCircles: number;
  matureWithSecondIn28: number;
  completedActions: number;
  founderPromptedActions: number;
  independentActions: number;
  circlesWithSharedHosting: number;
  rolesTaken: number;
  adaptations: { drafts: number; live: number; independentHosts: number };
  campaign: Record<Channel, { visits: number; joins: number; sharesOpened: number }>;
  joinsWithoutAttribution: number;
  rsvpsConfirmed: number;
  attendanceSelfReported: number;
  attendanceHostConfirmed: number;
  repeatParticipants: number;
  departures: { leftCircles: number; cancelledRsvps: number };
  negativeExperiences: number;
  missingFeedback: number;
  openReports: number;
  supportMinutes: number;
}

export function pilotMetrics(db: Db, ctx: Ctx, includeSample: boolean): PilotMetrics {
  requireOperator(db, ctx);
  const real = <T extends { isSample?: boolean }>(x: T) => includeSample || !x.isSample;
  const sampleUsers = new Set(db.users.filter((u) => u.isSample).map((u) => u.id));
  const realUser = (id: ID | undefined) => includeSample || !id || !sampleUsers.has(id);

  const circles = db.circles.filter(real);
  const actions = db.actions.filter(real);
  const actionIds = new Set(actions.map((a) => a.id));
  const rsvps = db.rsvps.filter((r) => actionIds.has(r.actionId) && realUser(r.userId));
  const completed = actions.filter((a) => a.status === "completed");

  let mature = 0;
  let matureWithSecond = 0;
  let sharedHosting = 0;
  for (const c of circles) {
    const done = completed.filter((a) => a.circleId === c.id).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const hosts = new Set(actions.filter((a) => a.circleId === c.id && a.status !== "draft").map((a) => a.hostId));
    if (hosts.size > 1) sharedHosting++;
    if (!done.length) continue;
    const first = new Date(done[0].startsAt).getTime();
    const second = done[1] ? new Date(done[1].startsAt).getTime() : undefined;
    const withinWindow = second !== undefined && second - first <= 28 * DAY;
    if (ctx.now.getTime() - first >= 28 * DAY || withinWindow) {
      mature++;
      if (withinWindow) matureWithSecond++;
    }
  }

  const campaign = {} as PilotMetrics["campaign"];
  for (const ch of ["x", "instagram", "tiktok", "link", "unknown"] as Channel[]) campaign[ch] = { visits: 0, joins: 0, sharesOpened: 0 };
  for (const e of db.campaignEvents.filter((e) => actionIds.has(e.actionId))) {
    const bucket = campaign[e.channel] ?? campaign.unknown;
    if (e.kind === "visit") bucket.visits++;
    if (e.kind === "join") bucket.joins++;
    if (e.kind === "share_opened") bucket.sharesOpened++;
  }

  const attendedBy = new Map<ID, Set<ID>>();
  for (const r of rsvps) {
    if (r.status !== "confirmed" || (r.attendance !== "self_reported" && r.attendance !== "host_confirmed")) continue;
    const set = attendedBy.get(r.userId) ?? new Set();
    set.add(r.actionId);
    attendedBy.set(r.userId, set);
  }

  const adaptations = actions.filter((a) => a.adaptedFromId);
  const operatorIds = new Set(db.users.filter((u) => u.isOperator).map((u) => u.id));
  const feedbackKeys = new Set(db.feedback.map((f) => `${f.actionId}:${f.userId}`));
  const completedIds = new Set(completed.map((a) => a.id));

  return {
    includesSample: includeSample && db.users.some((u) => u.isSample),
    circles: circles.length,
    matureCircles: mature,
    matureWithSecondIn28: matureWithSecond,
    completedActions: completed.length,
    founderPromptedActions: actions.filter((a) => a.founderPrompted && a.status !== "draft").length,
    independentActions: actions.filter((a) => !a.founderPrompted && (a.status === "published" || a.status === "completed")).length,
    circlesWithSharedHosting: sharedHosting,
    rolesTaken: rsvps.filter((r) => r.status === "confirmed" && r.roleSlotId).length,
    adaptations: {
      drafts: adaptations.filter((a) => a.status === "draft" || a.status === "in_review").length,
      live: adaptations.filter((a) => a.status === "published" || a.status === "completed").length,
      independentHosts: new Set(
        adaptations
          .filter((a) => (a.status === "published" || a.status === "completed") && !operatorIds.has(a.hostId) && !a.founderPrompted)
          .map((a) => a.hostId),
      ).size,
    },
    campaign,
    joinsWithoutAttribution: rsvps.filter((r) => !r.campaignCode).length,
    rsvpsConfirmed: rsvps.filter((r) => r.status === "confirmed").length,
    attendanceSelfReported: rsvps.filter((r) => r.attendance === "self_reported").length,
    attendanceHostConfirmed: rsvps.filter((r) => r.attendance === "host_confirmed").length,
    repeatParticipants: [...attendedBy.values()].filter((s) => s.size >= 2).length,
    departures: {
      leftCircles: db.memberships.filter((m) => m.leftAt && realUser(m.userId)).length,
      cancelledRsvps: rsvps.filter((r) => r.status === "cancelled").length,
    },
    negativeExperiences: db.feedback.filter((f) => actionIds.has(f.actionId) && (f.worthIt <= 2 || !f.feltWelcome)).length,
    missingFeedback: rsvps.filter(
      (r) => r.status === "confirmed" && completedIds.has(r.actionId) && !feedbackKeys.has(`${r.actionId}:${r.userId}`),
    ).length,
    openReports: db.reports.filter((r) => r.status === "open").length,
    supportMinutes: db.supportLogs.reduce((s, l) => s + l.minutes, 0),
  };
}
