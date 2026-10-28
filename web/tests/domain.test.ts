import { describe, expect, it } from "vitest";
import { buildSeed, SAMPLE_EXPIRED_TOKEN, SAMPLE_INVITE_TOKEN } from "@/lib/store/seed";
import { MemoryStore } from "@/lib/store/memory";
import type { Ctx, Db, User } from "@/lib/domain/types";
import { canSeePrivateDetails, canViewAction } from "@/lib/domain/access";
import { createInvitation, chooseRole, joinAction, leaveAction, confirmedCount } from "@/lib/domain/join";
import { createDraft, publishAction, reviewAction, updateAction, completeAction, cancelAction } from "@/lib/domain/actions";
import { adaptAction, ADAPTABLE_FIELDS } from "@/lib/domain/adapt";
import {
  feedbackAggregate,
  postMessage,
  recordStory,
  repeatAction,
  requestPublicStory,
  decideConsent,
  submitFeedback,
  FEEDBACK_AGGREGATE_MIN,
} from "@/lib/domain/circles";
import { chooseShareStrategy, publicShareFields, SHARE_STATUS_LABEL, recordCampaignEvent, xComposerUrl } from "@/lib/domain/share";
import { exportAccount, pilotMetrics } from "@/lib/domain/ops";
import { buildPublicView } from "@/lib/views";
import { DAY, newId } from "@/lib/domain/util";

const NOW = new Date("2026-11-01T10:00:00Z");
const ctx = (userId: string | null, now = NOW): Ctx => ({ userId, now });

function addUser(db: Db, id = newId("u"), extra: Partial<User> = {}): User {
  const u: User = {
    id,
    name: id,
    email: `${id}@test.invalid`,
    createdAt: NOW.toISOString(),
    adultConfirmed: true,
    hostStatus: "none",
    isOperator: false,
    notify: { email: true, reminders: true, circleMessages: true },
    ...extra,
  };
  db.users.push(u);
  return u;
}

function fillDraft(db: Db, hostId: string, actionId: string, overrides: Record<string, unknown> = {}) {
  return updateAction(db, ctx(hostId), actionId, {
    title: "Mending meetup",
    summary: "Fix one thing together.",
    whatToExpect: "Tea and stitches.",
    category: "repair",
    startsAt: new Date(NOW.getTime() + 10 * DAY).toISOString(),
    durationMins: 120,
    effort: "easy",
    costLabel: "Free",
    accessibility: "Step-free.",
    areaLabel: "Somewhere",
    venueName: "Public library",
    venueAddress: "10 Secret Road",
    venueNotes: "Knock twice",
    capacity: 3,
    visibility: "public",
    allowAdaptation: true,
    roles: [{ name: "Welcomer", emoji: "👋", description: "", capacity: 1 }],
    lessons: ["Bring biscuits"],
    ...overrides,
  });
}

describe("private access", () => {
  it("hides the exact venue from the public, the waitlist and outsiders", () => {
    const db = buildSeed(NOW);
    const a = db.actions.find((x) => x.id === "act_mend3")!;
    expect(canSeePrivateDetails(db, a, null)).toBe(false);
    expect(canSeePrivateDetails(db, a, "u_alex")).toBe(false);
    expect(canSeePrivateDetails(db, a, "u_ana")).toBe(true); // confirmed
    expect(canSeePrivateDetails(db, a, "u_maya")).toBe(true); // host

    const publicView = buildPublicView(db, ctx(null), a);
    expect(JSON.stringify(publicView)).not.toContain(a.venueAddress);
    expect(JSON.stringify(publicView)).not.toContain(a.venueNotes);

    const waitlisted = db.rsvps.find((r) => r.actionId === "act_peck1" && r.status === "waitlisted")!;
    const peck = db.actions.find((x) => x.id === "act_peck1")!;
    expect(canSeePrivateDetails(db, peck, waitlisted.userId)).toBe(false);
  });

  it("keeps Circle conversation private to members", () => {
    const db = buildSeed(NOW);
    expect(() => postMessage(db, ctx("u_alex"), "cir_mend", "hi")).toThrow(/private/);
    expect(() => postMessage(db, ctx(null), "cir_mend", "hi")).toThrow(/sign in/i);
    expect(postMessage(db, ctx("u_ana"), "cir_mend", "hello").body).toBe("hello");
  });

  it("drafts and plans in review are visible only to their host and operators", () => {
    const db = buildSeed(NOW);
    const r = db.actions.find((x) => x.id === "act_rosa1")!;
    expect(canViewAction(db, r, ctx(null))).toBe(false);
    expect(canViewAction(db, r, ctx("u_alex"))).toBe(false);
    expect(canViewAction(db, r, ctx("u_rosa"))).toBe(true);
    expect(canViewAction(db, r, ctx("u_ops"))).toBe(true);
  });
});

describe("invitations", () => {
  it("invite-only plans require a valid, unexpired invitation", () => {
    const db = buildSeed(NOW);
    const song = db.actions.find((x) => x.id === "act_song1")!;
    expect(canViewAction(db, song, ctx(null))).toBe(false);
    expect(canViewAction(db, song, ctx(null), SAMPLE_INVITE_TOKEN)).toBe(true);
    expect(canViewAction(db, song, ctx(null), SAMPLE_EXPIRED_TOKEN)).toBe(false);
    expect(() => joinAction(db, ctx("u_alex"), "act_song1", { inviteToken: SAMPLE_EXPIRED_TOKEN })).toThrow(/expired/);
    expect(joinAction(db, ctx("u_alex"), "act_song1", { inviteToken: SAMPLE_INVITE_TOKEN }).status).toBe("confirmed");
  });

  it("new invitations expire after their window and respect max uses", () => {
    const db = buildSeed(NOW);
    const inv = createInvitation(db, ctx("u_kai"), "act_song1", { days: 1, maxUses: 1 });
    const song = db.actions.find((x) => x.id === "act_song1")!;
    expect(canViewAction(db, song, ctx(null), inv.token)).toBe(true);
    const later = new Date(NOW.getTime() + 2 * DAY);
    expect(canViewAction(db, song, ctx(null, later), inv.token)).toBe(false);
    joinAction(db, ctx("u_alex"), "act_song1", { inviteToken: inv.token });
    const other = addUser(db);
    expect(() => joinAction(db, ctx(other.id), "act_song1", { inviteToken: inv.token })).toThrow(/expired/);
  });

  it("only hosts can create invitations", () => {
    const db = buildSeed(NOW);
    expect(() => createInvitation(db, ctx("u_alex"), "act_song1")).toThrow(/host/);
  });
});

describe("capacity under simultaneous requests", () => {
  it("never overfills, and waitlists the rest in order", async () => {
    const db = buildSeed(NOW);
    const host = addUser(db, "u_host", { hostStatus: "approved" });
    const draft = createDraft(db, ctx(host.id), { title: "Busy" });
    fillDraft(db, host.id, draft.id, { capacity: 5 });
    publishAction(db, ctx(host.id), draft.id);
    const people = Array.from({ length: 25 }, () => addUser(db));
    const store = new MemoryStore(db);

    const results = await Promise.all(
      people.map((p) => store.transact((d) => joinAction(d, ctx(p.id), draft.id, { roleSlotId: d.actions.find((a) => a.id === draft.id)!.roles[0].id }))),
    );
    const final = store.read();
    expect(confirmedCount(final, draft.id)).toBe(5);
    expect(results.filter((r) => r.status === "confirmed")).toHaveLength(5);
    expect(results.filter((r) => r.status === "waitlisted")).toHaveLength(20);
    // The single-capacity role went to exactly one person.
    expect(final.rsvps.filter((r) => r.actionId === draft.id && r.roleSlotId)).toHaveLength(1);
    // Waitlist positions are 1..20 with no duplicates.
    const positions = results.filter((r) => r.waitlistPosition).map((r) => r.waitlistPosition);
    expect(new Set(positions).size).toBe(20);
  });

  it("promotes the first waitlisted person when someone leaves", () => {
    const db = buildSeed(NOW);
    const peck = db.actions.find((x) => x.id === "act_peck1")!;
    const waiting = db.rsvps.find((r) => r.actionId === peck.id && r.status === "waitlisted")!;
    leaveAction(db, ctx("u_oli"), peck.id);
    expect(db.rsvps.find((r) => r.id === waiting.id)!.status).toBe("confirmed");
    expect(confirmedCount(db, peck.id)).toBe(peck.capacity);
  });

  it("a failed transaction leaves no partial writes", async () => {
    const db = buildSeed(NOW);
    const store = new MemoryStore(db);
    const before = store.read().rsvps.length;
    await expect(
      store.transact((d) => {
        joinAction(d, ctx("u_alex"), "act_mend3");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(store.read().rsvps.length).toBe(before);
  });

  it("rejects joining a role someone already holds", () => {
    const db = buildSeed(NOW);
    joinAction(db, ctx("u_alex"), "act_mend3");
    expect(() => chooseRole(db, ctx("u_alex"), "act_mend3", "role_m3_0")).toThrow(/took that role/);
    chooseRole(db, ctx("u_alex"), "act_mend3", "role_m3_2");
  });

  it("can't lower capacity below confirmed participants", () => {
    const db = buildSeed(NOW);
    const a = db.actions.find((x) => x.id === "act_mend3")!;
    expect(() => updateAction(db, ctx("u_maya"), a.id, { ...a, capacity: 2 })).toThrow(/already confirmed/);
  });
});

describe("adaptation", () => {
  it("only adapts formats the host authorised", () => {
    const db = buildSeed(NOW);
    expect(() => adaptAction(db, ctx("u_alex"), "act_song1")).toThrow(/hasn't made this format available/);
    expect(() => adaptAction(db, ctx("u_alex"), "act_rosa1")).toThrow(); // not published
    expect(adaptAction(db, ctx("u_alex"), "act_mend3").status).toBe("draft");
  });

  it("never clones private data", () => {
    const db = buildSeed(NOW);
    const src = db.actions.find((x) => x.id === "act_mend3")!;
    const draft = adaptAction(db, ctx("u_alex"), src.id);
    expect(draft.venueAddress).toBe("");
    expect(draft.venueNotes).toBe("");
    expect(draft.venueName).toBe("");
    expect(draft.circleId).toBeUndefined();
    expect(draft.hostId).toBe("u_alex");
    expect(draft.campaignCode).not.toBe(src.campaignCode);
    expect(draft.roles.map((r) => r.id)).not.toEqual(src.roles.map((r) => r.id));
    expect(db.rsvps.filter((r) => r.actionId === draft.id)).toHaveLength(0);
    expect(db.invitations.filter((i) => i.actionId === draft.id)).toHaveLength(0);
    expect(JSON.stringify(draft)).not.toContain("Sample Street");
    expect(ADAPTABLE_FIELDS).not.toContain("venueAddress" as never);
    // Attribution is preserved.
    expect(draft.adaptedFromId).toBe(src.id);
    expect(draft.lineageRootId).toBe("act_mend1");
  });

  it("new hosts go through pilot review before going live", () => {
    const db = buildSeed(NOW);
    const draft = adaptAction(db, ctx("u_alex"), "act_mend3");
    fillDraft(db, "u_alex", draft.id);
    expect(publishAction(db, ctx("u_alex"), draft.id)).toBe("in_review");
    expect(() => reviewAction(db, ctx("u_alex"), draft.id, "approve", "")).toThrow(/Operators/);
    reviewAction(db, ctx("u_ops"), draft.id, "approve", "Looks great");
    expect(db.actions.find((a) => a.id === draft.id)!.status).toBe("published");
    expect(db.users.find((u) => u.id === "u_alex")!.hostStatus).toBe("approved");
  });
});

describe("sharing", () => {
  it("falls back to download + copy when files can't be shared", () => {
    const none = { canShareFiles: false, canShare: false, canClipboard: true };
    expect(chooseShareStrategy("instagram", none)).toBe("download-and-copy");
    expect(chooseShareStrategy("tiktok", { ...none, canShareFiles: true })).toBe("native-files");
    expect(chooseShareStrategy("link", { ...none, canShare: true })).toBe("native-link");
    expect(chooseShareStrategy("link", none)).toBe("download-and-copy");
  });

  it("is honest that opening a share sheet isn't posting", () => {
    expect(SHARE_STATUS_LABEL.share_opened).toMatch(/can't see whether/);
    for (const [k, v] of Object.entries(SHARE_STATUS_LABEL)) {
      if (k !== "visit" && k !== "join") expect(v).toMatch(/not|can't/);
    }
  });

  it("public share assets never include private fields", () => {
    const db = buildSeed(NOW);
    const a = db.actions.find((x) => x.id === "act_mend3")!;
    const s = JSON.stringify(publicShareFields(a));
    expect(s).not.toContain(a.venueAddress);
    expect(s).not.toContain(a.venueNotes);
    expect(xComposerUrl("hi", "https://x.test/a")).toMatch(/^https:\/\/x\.com\/intent\/post\?/);
  });

  it("only counts visits that carry the real campaign code", () => {
    const db = buildSeed(NOW);
    const before = db.campaignEvents.length;
    recordCampaignEvent(db, ctx(null), "act_mend3", "visit", "x", "WRONG");
    recordCampaignEvent(db, ctx(null), "act_mend3", "visit", "x", "MEND3");
    expect(db.campaignEvents.length).toBe(before + 1);
  });
});

describe("feedback & stories", () => {
  it("hosts see aggregates only with at least five responses, never private notes", () => {
    const db = buildSeed(NOW);
    const agg = feedbackAggregate(db, ctx("u_maya"), "act_mend1");
    expect(agg.responses).toBeGreaterThanOrEqual(FEEDBACK_AGGREGATE_MIN);
    expect(agg.visible).toBe(true);
    expect(JSON.stringify(agg)).not.toContain("private note");
    const small = feedbackAggregate(db, ctx("u_dev"), "act_mend2");
    expect(small.visible).toBe(false);
    expect(small.avgWorthIt).toBeUndefined();
    expect(() => feedbackAggregate(db, ctx("u_ana"), "act_mend1")).toThrow(/Hosts only/);
  });

  it("stories go public only once every participant consents", () => {
    const db = buildSeed(NOW);
    const s = requestPublicStory(db, ctx("u_dev"), "sty_mend2");
    expect(s.visibility).toBe("awaiting_consent");
    const others = Object.keys(s.consents).filter((id) => id !== "u_dev");
    for (const id of others.slice(0, -1)) decideConsent(db, ctx(id), s.id, true);
    expect(db.stories.find((x) => x.id === s.id)!.visibility).toBe("awaiting_consent");
    decideConsent(db, ctx(others.at(-1)!), s.id, false);
    expect(db.stories.find((x) => x.id === s.id)!.visibility).toBe("private");
  });
});

describe("the full loop: join → participate → repeat → adapt", () => {
  it("works end to end", () => {
    const db = buildSeed(NOW);
    // Host creates and publishes.
    const host = addUser(db, "u_h", { hostStatus: "approved" });
    const d = createDraft(db, ctx(host.id), { templateId: "tpl_repair" });
    fillDraft(db, host.id, d.id, { capacity: 4 });
    expect(publishAction(db, ctx(host.id), d.id)).toBe("published");
    const action = db.actions.find((a) => a.id === d.id)!;
    expect(action.circleId).toBeTruthy();

    // People join.
    const p1 = addUser(db);
    const p2 = addUser(db);
    expect(joinAction(db, ctx(p1.id), d.id, { campaignCode: action.campaignCode, channel: "instagram" }).status).toBe("confirmed");
    joinAction(db, ctx(p2.id), d.id);

    // It happens.
    const after = new Date(new Date(action.startsAt).getTime() + DAY);
    completeAction(db, ctx(host.id, after), d.id);
    submitFeedback(db, ctx(p1.id, after), d.id, { worthIt: 5, wouldReturn: true, feltWelcome: true, privateNote: "loved it" });
    recordStory(db, ctx(host.id, after), d.id, { whatHappened: "We fixed stuff", learned: "More tea", next: "Again!", lessons: ["Start with tea"] });
    expect(action.lessons).toContain("Start with tea");

    // A participant hosts the repeat — no fresh review needed inside an established Circle.
    const p1User = db.users.find((u) => u.id === p1.id)!;
    expect(p1User.hostStatus).toBe("none");
    const next = repeatAction(db, ctx(p1.id, after), d.id);
    expect(next.circleId).toBe(action.circleId);
    expect(next.lessons).toContain("Start with tea");
    fillDraft(db, p1.id, next.id, { startsAt: new Date(after.getTime() + 14 * DAY).toISOString() });
    expect(publishAction(db, ctx(p1.id, after), next.id)).toBe("published");

    // Someone else adapts it for their people.
    const newHost = addUser(db);
    const adapted = adaptAction(db, ctx(newHost.id, after), next.id);
    expect(adapted.lineageRootId).toBe(d.id);
    expect(adapted.venueAddress).toBe("");

    // Export never includes other people's private notes.
    const exp = JSON.stringify(exportAccount(db, ctx(p2.id, after)));
    expect(exp).not.toContain("loved it");
  });

  it("cancelling notifies everyone and blocks joining", () => {
    const db = buildSeed(NOW);
    cancelAction(db, ctx("u_maya"), "act_mend3", "Venue flooded");
    expect(db.notifications.filter((n) => n.text.includes("cancelled")).length).toBeGreaterThan(0);
    expect(() => joinAction(db, ctx("u_alex"), "act_mend3")).toThrow(/cancelled/);
  });

  it("metrics exclude sample data by default", () => {
    const db = buildSeed(NOW);
    const real = pilotMetrics(db, ctx("u_ops"), false);
    expect(real.circles).toBe(0);
    expect(real.includesSample).toBe(false);
    const sample = pilotMetrics(db, ctx("u_ops"), true);
    expect(sample.includesSample).toBe(true);
    expect(sample.matureCircles).toBe(2);
    expect(sample.matureWithSecondIn28).toBe(1);
    expect(() => pilotMetrics(db, ctx("u_maya"), true)).toThrow(/Operators/);
  });
});
