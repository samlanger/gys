import type { Action, Ctx, Db, Feedback, ID, Story } from "./types";
import { activeMembership, assertCircleAccess, canManageAction, liveRsvp } from "./access";
import { audit, campaignCode, clampText, DAY, fail, newId, notify, requireUser, slugify } from "./util";

/** Hosts see feedback only in aggregate, and only once enough people have responded. */
export const FEEDBACK_AGGREGATE_MIN = 5;

export function postMessage(db: Db, ctx: Ctx, circleId: ID, body: string) {
  const user = requireUser(db, ctx);
  assertCircleAccess(db, circleId, user.id);
  const text = clampText(body, 1000);
  if (!text) fail("invalid", "Say something first.");
  const msg = { id: newId("msg"), circleId, userId: user.id, body: text, createdAt: ctx.now.toISOString() };
  db.messages.push(msg);
  for (const m of db.memberships.filter((m) => m.circleId === circleId && !m.leftAt && m.userId !== user.id)) {
    const member = db.users.find((u) => u.id === m.userId);
    if (member?.notify.circleMessages) notify(db, ctx, m.userId, `${user.name}: ${text.slice(0, 60)}`, `/c/${circleId}`);
  }
  return msg;
}

export function leaveCircle(db: Db, ctx: Ctx, circleId: ID) {
  const user = requireUser(db, ctx);
  const m = activeMembership(db, circleId, user.id);
  if (!m) fail("not_found", "You're not in this Circle.");
  m.leftAt = ctx.now.toISOString();
  // Leaving also frees any upcoming places.
  for (const a of db.actions.filter((a) => a.circleId === circleId && a.status === "published")) {
    const r = liveRsvp(db, a.id, user.id);
    if (r) {
      r.status = "cancelled";
      r.cancelledAt = ctx.now.toISOString();
      r.roleSlotId = undefined;
    }
  }
  audit(db, ctx, "circle.left", "circle", circleId);
}

export function submitFeedback(
  db: Db,
  ctx: Ctx,
  actionId: ID,
  input: { worthIt: number; wouldReturn: boolean; feltWelcome: boolean; privateNote: string },
): Feedback {
  const user = requireUser(db, ctx);
  const action = db.actions.find((a) => a.id === actionId);
  if (!action) fail("not_found", "Not found.");
  const rsvp = liveRsvp(db, actionId, user.id);
  if (!rsvp || rsvp.status !== "confirmed") fail("forbidden", "Feedback is for people who took part.");
  if (new Date(action.startsAt).getTime() > ctx.now.getTime()) fail("conflict", "It hasn't happened yet.");
  const worthIt = Math.min(5, Math.max(1, Math.round(Number(input.worthIt)))) as Feedback["worthIt"];
  const existing = db.feedback.find((f) => f.actionId === actionId && f.userId === user.id);
  const fb: Feedback = {
    id: existing?.id ?? newId("fb"),
    actionId,
    userId: user.id,
    worthIt,
    wouldReturn: !!input.wouldReturn,
    feltWelcome: !!input.feltWelcome,
    privateNote: clampText(input.privateNote, 1000),
    createdAt: ctx.now.toISOString(),
  };
  if (existing) Object.assign(existing, fb);
  else db.feedback.push(fb);
  if (rsvp.attendance === "unknown") rsvp.attendance = "self_reported";
  return fb;
}

export interface FeedbackAggregate {
  responses: number;
  visible: boolean;
  avgWorthIt?: number;
  wouldReturnPct?: number;
  feltWelcomePct?: number;
}

/** What a host may see. Private notes are never included. */
export function feedbackAggregate(db: Db, ctx: Ctx, actionId: ID): FeedbackAggregate {
  const user = requireUser(db, ctx);
  const action = db.actions.find((a) => a.id === actionId);
  if (!action) fail("not_found", "Not found.");
  if (!canManageAction(db, action, user.id) && !user.isOperator) fail("forbidden", "Hosts only.");
  const rows = db.feedback.filter((f) => f.actionId === actionId);
  if (rows.length < FEEDBACK_AGGREGATE_MIN) return { responses: rows.length, visible: false };
  const pct = (n: number) => Math.round((n / rows.length) * 100);
  return {
    responses: rows.length,
    visible: true,
    avgWorthIt: Math.round((rows.reduce((s, f) => s + f.worthIt, 0) / rows.length) * 10) / 10,
    wouldReturnPct: pct(rows.filter((f) => f.wouldReturn).length),
    feltWelcomePct: pct(rows.filter((f) => f.feltWelcome).length),
  };
}

export function sendAppreciation(db: Db, ctx: Ctx, actionId: ID, toId: ID, message: string) {
  const user = requireUser(db, ctx);
  const action = db.actions.find((a) => a.id === actionId);
  if (!action?.circleId) fail("not_found", "Not found.");
  assertCircleAccess(db, action.circleId, user.id);
  if (toId === user.id) fail("invalid", "Thank someone else 🙂");
  const target = db.memberships.find((m) => m.circleId === action.circleId && m.userId === toId && !m.leftAt);
  if (!target) fail("invalid", "They're not in this Circle.");
  const text = clampText(message, 200);
  if (text.length < 3) fail("invalid", "Say what you appreciated.");
  const a = { id: newId("thx"), actionId, circleId: action.circleId, fromId: user.id, toId, message: text, createdAt: ctx.now.toISOString() };
  db.appreciations.push(a);
  notify(db, ctx, toId, `${user.name} thanked you: “${text.slice(0, 60)}”`, `/c/${action.circleId}`);
  return a;
}

export function recordStory(
  db: Db,
  ctx: Ctx,
  actionId: ID,
  input: { whatHappened: string; learned: string; next: string; lessons?: string[] },
): Story {
  const user = requireUser(db, ctx);
  const action = db.actions.find((a) => a.id === actionId);
  if (!action?.circleId) fail("not_found", "Not found.");
  assertCircleAccess(db, action.circleId, user.id);
  if (new Date(action.startsAt).getTime() > ctx.now.getTime()) fail("conflict", "Tell the story after it happens.");
  const whatHappened = clampText(input.whatHappened, 2000);
  if (!whatHappened) fail("invalid", "Tell us what happened.");
  const story: Story = {
    id: newId("sty"),
    circleId: action.circleId,
    actionId,
    authorId: user.id,
    whatHappened,
    learned: clampText(input.learned, 1000),
    next: clampText(input.next, 500),
    visibility: "private",
    consents: {},
    createdAt: ctx.now.toISOString(),
  };
  db.stories.push(story);
  if (canManageAction(db, action, user.id) && input.lessons?.length) {
    action.lessons = Array.from(new Set([...action.lessons, ...input.lessons.map((l) => clampText(l, 200)).filter(Boolean)])).slice(0, 10);
  }
  audit(db, ctx, "story.recorded", "story", story.id);
  return story;
}

/** Ask every confirmed participant for consent. Public only after all of them grant it. */
export function requestPublicStory(db: Db, ctx: Ctx, storyId: ID): Story {
  const user = requireUser(db, ctx);
  const story = db.stories.find((s) => s.id === storyId);
  if (!story) fail("not_found", "Not found.");
  if (story.authorId !== user.id) fail("forbidden", "Only the author can ask to share this.");
  const people = new Set(
    db.rsvps.filter((r) => r.actionId === story.actionId && r.status === "confirmed").map((r) => r.userId),
  );
  const action = db.actions.find((a) => a.id === story.actionId);
  if (action) people.add(action.hostId);
  story.consents = {};
  for (const id of people) story.consents[id] = id === user.id ? "granted" : "pending";
  story.visibility = "awaiting_consent";
  for (const id of people) {
    if (id !== user.id) notify(db, ctx, id, `${user.name} would like to share a story about your Circle publicly. OK with you?`, `/c/${story.circleId}`);
  }
  settleStory(db, ctx, story);
  return story;
}

export function decideConsent(db: Db, ctx: Ctx, storyId: ID, granted: boolean): Story {
  const user = requireUser(db, ctx);
  const story = db.stories.find((s) => s.id === storyId);
  if (!story) fail("not_found", "Not found.");
  if (!(user.id in story.consents)) fail("forbidden", "Your consent isn't needed for this story.");
  story.consents[user.id] = granted ? "granted" : "declined";
  if (!granted && story.visibility === "public") story.visibility = "private";
  settleStory(db, ctx, story);
  audit(db, ctx, granted ? "story.consent_granted" : "story.consent_declined", "story", storyId);
  return story;
}

function settleStory(db: Db, ctx: Ctx, story: Story) {
  const values = Object.values(story.consents);
  if (values.includes("declined")) {
    story.visibility = "private";
  } else if (values.length && values.every((v) => v === "granted")) {
    story.visibility = "public";
    story.publishedAt = ctx.now.toISOString();
  }
}

export function withdrawStory(db: Db, ctx: Ctx, storyId: ID) {
  const user = requireUser(db, ctx);
  const story = db.stories.find((s) => s.id === storyId);
  if (!story) fail("not_found", "Not found.");
  if (story.authorId !== user.id && !(user.id in story.consents) && !user.isOperator) fail("forbidden", "Not allowed.");
  story.visibility = "private";
  if (user.id in story.consents) story.consents[user.id] = "declined";
  audit(db, ctx, "story.withdrawn", "story", storyId);
}

/**
 * "Choose the next date": copy the format into a new draft in the same Circle,
 * carrying lessons forward. Any member can host the next one.
 */
export function repeatAction(db: Db, ctx: Ctx, actionId: ID, startsAt?: string): Action {
  const user = requireUser(db, ctx);
  const prev = db.actions.find((a) => a.id === actionId);
  if (!prev?.circleId) fail("not_found", "Not found.");
  assertCircleAccess(db, prev.circleId, user.id);
  const start = startsAt && !Number.isNaN(Date.parse(startsAt)) ? new Date(startsAt) : new Date(new Date(prev.startsAt).getTime() + 14 * DAY);
  if (start.getTime() <= ctx.now.getTime()) {
    start.setTime(ctx.now.getTime() + 7 * DAY);
  }
  const next: Action = {
    ...structuredClone(prev),
    id: newId("act"),
    slug: slugify(prev.title),
    hostId: user.id,
    status: "draft",
    startsAt: start.toISOString(),
    // Venue stays within the Circle: only members can repeat, and they already know it.
    createdAt: ctx.now.toISOString(),
    publishedAt: undefined,
    completedAt: undefined,
    cancelledAt: undefined,
    cancelReason: undefined,
    reviewNote: undefined,
    lineageRootId: prev.lineageRootId ?? prev.id,
    campaignCode: campaignCode(),
    founderPrompted: false,
    roles: prev.roles.map((r) => ({ ...r, id: newId("role") })),
    isSample: undefined,
  };
  db.actions.push(next);
  audit(db, ctx, "action.repeated", "action", next.id, { from: prev.id });
  return next;
}

/** Visual "garden": one plant per completed gathering, flowers per role taken, sparkles per thank-you. */
export function circleGarden(db: Db, circleId: ID) {
  const actions = db.actions
    .filter((a) => a.circleId === circleId && a.status === "completed")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return actions.map((a) => ({
    actionId: a.id,
    title: a.title,
    date: a.startsAt,
    people: db.rsvps.filter((r) => r.actionId === a.id && r.status === "confirmed").length,
    roles: db.rsvps.filter((r) => r.actionId === a.id && r.status === "confirmed" && r.roleSlotId).length,
    thanks: db.appreciations.filter((t) => t.actionId === a.id).length,
    hostId: a.hostId,
  }));
}
