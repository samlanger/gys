import type { Action, Db, Effort, ID, RoleSlot, Rsvp, Template, User } from "@/lib/domain/types";
import { DAY, emptyDb } from "@/lib/domain/util";

/**
 * SAMPLE DATA for the demo. Every record is flagged isSample and the UI labels
 * it as such. None of it is real activity and pilot metrics exclude it by default.
 */

const roles = {
  welcome: { name: "Welcomer", emoji: "👋", description: "Say hi at the door and do name stickers.", capacity: 1 },
  tea: { name: "Tea & biscuits", emoji: "🍪", description: "Bring something to share (we'll pay you back).", capacity: 2 },
  kit: { name: "Spare-kit keeper", emoji: "🧰", description: "Bring spare needles, thread and scissors.", capacity: 1 },
  tidy: { name: "Tidy-up crew", emoji: "🧹", description: "Help leave the space nicer than we found it.", capacity: 2 },
  story: { name: "Story-taker", emoji: "📝", description: "Jot down what worked for next time.", capacity: 1 },
  music: { name: "Playlist", emoji: "🎶", description: "Quiet background music, nothing shouty.", capacity: 1 },
};

const withIds = (prefix: string, list: Omit<RoleSlot, "id">[]): RoleSlot[] =>
  list.map((r, i) => ({ ...r, id: `role_${prefix}_${i}` }));

const REPAIR_FORMAT = {
  title: "Beginner repair afternoon",
  summary: "Bring one thing with a hole, rip or loose button. Leave with it fixed — and a new skill.",
  whatToExpect:
    "We start with tea and a 10-minute demo of three basic stitches. Then everyone works on their own item, with help on hand. No experience needed — most people have never threaded a needle. We finish by showing off our fixes.",
  category: "repair",
  durationMins: 150,
  effort: "easy" as Effort,
  costLabel: "Free · materials provided",
  accessibility:
    "Step-free entrance and accessible toilet. Good lighting and magnifiers available. Seated activity; quiet corner if you need a break.",
  lessons: [
    "Pre-thread a few needles before people arrive — it removes the first hurdle.",
    "Ask everyone to bring one item only; it keeps the pace relaxed.",
    "A 5-minute show-and-tell at the end is everyone's favourite part.",
  ],
};

export const SAMPLE_INVITE_TOKEN = "sampleinvitetoken";
export const SAMPLE_EXPIRED_TOKEN = "sampleexpiredtoken";

export function buildSeed(now: Date): Db {
  const db = emptyDb();
  const t = (days: number, hour = 14) => {
    const d = new Date(now.getTime() + days * DAY);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const created = t(-60);

  const person = (id: string, name: string, extra: Partial<User> = {}): User => ({
    id,
    name,
    email: `${id.replace("u_", "")}@sample.invalid`,
    createdAt: created,
    adultConfirmed: true,
    hostStatus: "none",
    isOperator: false,
    notify: { email: true, reminders: true, circleMessages: true },
    isSample: true,
    ...extra,
  });

  db.users.push(
    person("u_ops", "Pilot operator", { isOperator: true, hostStatus: "approved", bio: "Sample operator account." }),
    person("u_maya", "Maya", { hostStatus: "approved", bio: "Fixes things. Drinks a lot of tea." }),
    person("u_dev", "Dev", { hostStatus: "approved", bio: "Learned to darn in March. Now hosts sometimes." }),
    person("u_ana", "Ana"),
    person("u_tom", "Tom"),
    person("u_jo", "Jo"),
    person("u_sam", "Sam"),
    person("u_lee", "Lee"),
    person("u_priya", "Priya", { hostStatus: "approved" }),
    person("u_ife", "Ifeoma", { hostStatus: "approved", bio: "Tried Maya's format in Peckham." }),
    person("u_kai", "Kai", { hostStatus: "approved" }),
    person("u_rosa", "Rosa", { hostStatus: "pending" }),
    person("u_ben", "Ben"),
    person("u_nia", "Nia"),
    person("u_oli", "Oli"),
    person("u_alex", "Alex", { bio: "Just arrived. Saw a video about mending jeans." }),
  );

  const action = (a: Partial<Action> & Pick<Action, "id" | "slug" | "hostId" | "status" | "startsAt">): Action => ({
    ...REPAIR_FORMAT,
    roles: [],
    lessons: [],
    areaLabel: "Hackney, London",
    venueName: "Hackney Library — Community Room",
    venueAddress: "1 Sample Street, London E8 0XX (sample address)",
    venueNotes: "Use the side door by the bike racks. Room 2, first floor (lift available).",
    capacity: 8,
    visibility: "public",
    allowAdaptation: true,
    createdAt: created,
    campaignCode: a.id.slice(4, 10).toUpperCase(),
    founderPrompted: false,
    isSample: true,
    ...a,
  });

  // ── Circle 1: Mend & Natter — three gatherings, hosting shared ─────────────
  db.circles.push({ id: "cir_mend", name: "Mend & Natter", emoji: "🧵", createdAt: t(-40), createdBy: "u_maya", isSample: true });
  const mendRoles = withIds("m1", [roles.welcome, roles.tea, roles.kit, roles.tidy]);
  db.actions.push(
    action({
      id: "act_mend1",
      slug: "beginner-repair-afternoon-mend1",
      circleId: "cir_mend",
      hostId: "u_maya",
      status: "completed",
      startsAt: t(-30),
      publishedAt: t(-40),
      completedAt: t(-30, 18),
      roles: mendRoles,
      lessons: REPAIR_FORMAT.lessons.slice(0, 2),
      sourceUrl: "https://example.com/sample-visible-mending-video",
      sourceCredit: "A visible-mending video (sample link)",
      founderPrompted: true,
    }),
    action({
      id: "act_mend2",
      lineageRootId: "act_mend1",
      slug: "beginner-repair-afternoon-mend2",
      circleId: "cir_mend",
      hostId: "u_dev",
      status: "completed",
      startsAt: t(-12),
      publishedAt: t(-25),
      completedAt: t(-12, 18),
      title: "Repair afternoon: jeans edition",
      roles: withIds("m2", [roles.welcome, roles.tea, roles.kit, roles.story]),
      lessons: REPAIR_FORMAT.lessons,
      sourceUrl: "https://example.com/sample-visible-mending-video",
      sourceCredit: "A visible-mending video (sample link)",
    }),
    action({
      id: "act_mend3",
      lineageRootId: "act_mend1",
      slug: "beginner-repair-afternoon-mend3",
      circleId: "cir_mend",
      hostId: "u_maya",
      status: "published",
      startsAt: t(9),
      publishedAt: t(-5),
      roles: withIds("m3", [roles.welcome, roles.tea, roles.kit, roles.tidy, roles.music]),
      lessons: REPAIR_FORMAT.lessons,
      sourceUrl: "https://example.com/sample-visible-mending-video",
      sourceCredit: "A visible-mending video (sample link)",
    }),
  );

  // ── Circle 2: Sourdough Swap — one gathering, no second yet (honest metrics) ──
  db.circles.push({ id: "cir_bread", name: "Sourdough Swap", emoji: "🍞", createdAt: t(-45), createdBy: "u_priya", isSample: true });
  db.actions.push(
    action({
      id: "act_bread1",
      slug: "bread-swap-morning-bread1",
      circleId: "cir_bread",
      hostId: "u_priya",
      status: "completed",
      startsAt: t(-35, 10),
      publishedAt: t(-45),
      completedAt: t(-35, 13),
      title: "Bread & starter swap morning",
      summary: "Bring a loaf (any loaf!) or a jar of starter. Swap, taste, and learn a simple no-knead recipe.",
      whatToExpect: "Tasting table, a 15-minute no-knead demo, and a starter giveaway. Shop-bought bread is welcome.",
      category: "cooking",
      durationMins: 120,
      costLabel: "Free",
      areaLabel: "Walthamstow, London",
      venueName: "Walthamstow Community Kitchen",
      venueAddress: "2 Sample Road, London E17 0XX (sample address)",
      accessibility: "Step-free. Ingredients labelled for common allergens. Seating available.",
      roles: withIds("b1", [roles.welcome, roles.tidy]),
      lessons: [],
      founderPrompted: true,
    }),
  );

  // ── Circle 3: an independent adaptation of Mend & Natter, now full ─────────
  db.circles.push({ id: "cir_peck", name: "Peckham Patch-Up", emoji: "🪡", createdAt: t(-6), createdBy: "u_ife", isSample: true });
  db.actions.push(
    action({
      id: "act_peck1",
      slug: "beginner-repair-afternoon-peck1",
      circleId: "cir_peck",
      hostId: "u_ife",
      status: "published",
      startsAt: t(16, 13),
      publishedAt: t(-6),
      areaLabel: "Peckham, London",
      venueName: "Peckham Library — Studio",
      venueAddress: "3 Sample Lane, London SE15 0XX (sample address)",
      capacity: 6,
      roles: withIds("p1", [roles.welcome, roles.tea, roles.kit]),
      lessons: REPAIR_FORMAT.lessons,
      adaptedFromId: "act_mend1",
      lineageRootId: "act_mend1",
      sourceUrl: "https://example.com/sample-visible-mending-video",
      sourceCredit: "A visible-mending video (sample link)",
    }),
  );

  // ── Circle 4: invite-only song circle ──────────────────────────────────────
  db.circles.push({ id: "cir_song", name: "Three-Chord Club", emoji: "🎸", createdAt: t(-3), createdBy: "u_kai", isSample: true });
  db.actions.push(
    action({
      id: "act_song1",
      slug: "three-chord-song-circle-song1",
      circleId: "cir_song",
      hostId: "u_kai",
      status: "published",
      visibility: "invite",
      startsAt: t(6, 19),
      publishedAt: t(-3),
      title: "Three-chord song circle",
      summary: "Learn G, C and D, then play a whole song together by the end of the evening.",
      whatToExpect: "Loaner guitars and ukuleles available. We go slowly. Singing optional, laughing encouraged.",
      category: "music",
      durationMins: 120,
      costLabel: "£3 suggested for strings",
      areaLabel: "Dalston, London",
      venueName: "Dalston Community Hall",
      venueAddress: "4 Sample Yard, London E8 0XX (sample address)",
      accessibility: "Step-free. Some instruments are lighter/smaller. Chord sheets in large print.",
      capacity: 10,
      roles: withIds("s1", [roles.welcome, roles.tea]),
      allowAdaptation: false,
    }),
  );
  db.invitations.push(
    { id: "inv_song_ok", actionId: "act_song1", token: SAMPLE_INVITE_TOKEN, createdBy: "u_kai", createdAt: t(-3), expiresAt: t(10), maxUses: 20, uses: 1 },
    { id: "inv_song_old", actionId: "act_song1", token: SAMPLE_EXPIRED_TOKEN, createdBy: "u_kai", createdAt: t(-20), expiresAt: t(-13), maxUses: 20, uses: 0 },
  );

  // ── In review: Rosa's adaptation waiting for operator review ───────────────
  db.actions.push(
    action({
      id: "act_rosa1",
      slug: "beginner-repair-afternoon-rosa1",
      hostId: "u_rosa",
      status: "in_review",
      startsAt: t(20, 11),
      areaLabel: "Leyton, London",
      venueName: "Leyton Library — Meeting Room",
      venueAddress: "5 Sample Avenue, London E10 0XX (sample address)",
      capacity: 6,
      roles: withIds("r1", [roles.welcome, roles.kit]),
      lessons: REPAIR_FORMAT.lessons,
      adaptedFromId: "act_mend2",
      lineageRootId: "act_mend1",
      sourceUrl: "https://example.com/sample-visible-mending-video",
      sourceCredit: "A visible-mending video (sample link)",
    }),
  );

  // ── RSVPs ──────────────────────────────────────────────────────────────────
  let n = 0;
  const rsvp = (actionId: ID, userId: ID, daysAgo: number, extra: Partial<Rsvp> = {}) => {
    n++;
    db.rsvps.push({
      id: `rsvp_s${n}`,
      actionId,
      userId,
      status: "confirmed",
      createdAt: new Date(now.getTime() - daysAgo * DAY + n * 1000).toISOString(),
      attendance: "unknown",
      ...extra,
    });
  };
  const attended = { attendance: "host_confirmed" as const };
  ["u_ana", "u_tom", "u_jo", "u_sam", "u_lee", "u_dev", "u_ben"].forEach((u, i) =>
    rsvp("act_mend1", u, 38, { ...attended, roleSlotId: i < 4 ? mendRoles[i].id : undefined, campaignCode: i < 3 ? "MEND1" : undefined, channel: i < 3 ? "instagram" : undefined }),
  );
  ["u_ana", "u_tom", "u_jo", "u_lee", "u_maya", "u_nia"].forEach((u, i) =>
    rsvp("act_mend2", u, 20, { attendance: i === 5 ? "self_reported" : "host_confirmed", roleSlotId: i < 3 ? `role_m2_${i}` : undefined }),
  );
  ["u_ana", "u_jo", "u_dev", "u_nia", "u_oli", "u_ben"].forEach((u, i) => rsvp("act_mend3", u, 4 - i * 0.3, { roleSlotId: i < 2 ? `role_m3_${i}` : undefined }));
  ["u_ana", "u_sam", "u_ben", "u_nia"].forEach((u) => rsvp("act_bread1", u, 40, attended));
  ["u_oli", "u_ben", "u_nia", "u_lee", "u_sam", "u_tom"].forEach((u, i) =>
    rsvp("act_peck1", u, 5 - i * 0.2, { campaignCode: i < 2 ? "PECK1" : undefined, channel: i < 2 ? "tiktok" : undefined }),
  );
  rsvp("act_peck1", "u_jo", 1, { status: "waitlisted" });
  ["u_tom", "u_lee"].forEach((u) => rsvp("act_song1", u, 2));

  // ── Memberships ────────────────────────────────────────────────────────────
  const member = (circleId: ID, userId: ID, role: "host" | "member", days: number, leftAt?: string) =>
    db.memberships.push({ circleId, userId, role, joinedAt: t(-days), leftAt });
  member("cir_mend", "u_maya", "host", 40);
  member("cir_mend", "u_dev", "host", 38);
  ["u_ana", "u_tom", "u_jo", "u_lee", "u_ben", "u_nia", "u_oli"].forEach((u) => member("cir_mend", u, "member", 30));
  member("cir_mend", "u_sam", "member", 38, t(-20));
  member("cir_bread", "u_priya", "host", 45);
  ["u_ana", "u_sam", "u_ben", "u_nia"].forEach((u) => member("cir_bread", u, "member", 40));
  member("cir_peck", "u_ife", "host", 6);
  ["u_oli", "u_ben", "u_nia", "u_lee", "u_sam", "u_tom"].forEach((u) => member("cir_peck", u, "member", 5));
  member("cir_song", "u_kai", "host", 3);
  ["u_tom", "u_lee"].forEach((u) => member("cir_song", u, "member", 2));

  // ── Private feedback (6 responses → host can see aggregate) ────────────────
  const fb = (actionId: ID, userId: ID, worthIt: 1 | 2 | 3 | 4 | 5, wouldReturn: boolean, feltWelcome = true) =>
    db.feedback.push({ id: `fb_${actionId}_${userId}`, actionId, userId, worthIt, wouldReturn, feltWelcome, privateNote: "(sample private note — never shown to hosts)", createdAt: t(-29) });
  fb("act_mend1", "u_ana", 5, true);
  fb("act_mend1", "u_tom", 4, true);
  fb("act_mend1", "u_jo", 5, true);
  fb("act_mend1", "u_sam", 2, false, false);
  fb("act_mend1", "u_lee", 4, true);
  fb("act_mend1", "u_dev", 5, true);
  fb("act_mend2", "u_ana", 5, true);
  fb("act_mend2", "u_jo", 4, true);

  // ── Appreciation, messages, stories ────────────────────────────────────────
  const thx = (actionId: ID, fromId: ID, toId: ID, message: string, days: number) =>
    db.appreciations.push({ id: `thx_${db.appreciations.length}`, actionId, circleId: "cir_mend", fromId, toId, message, createdAt: t(-days) });
  thx("act_mend1", "u_ana", "u_maya", "Pre-threaded needles = genius. I actually finished my sleeve!", 29);
  thx("act_mend1", "u_maya", "u_jo", "Thank you for the spare scissors and for staying to tidy.", 29);
  thx("act_mend2", "u_tom", "u_dev", "First time hosting and it felt so calm. Great playlist too.", 11);
  thx("act_mend2", "u_dev", "u_lee", "Lee's show-and-tell of the patched tote bag 🔥", 11);

  const msg = (circleId: ID, userId: ID, body: string, days: number) =>
    db.messages.push({ id: `msg_${db.messages.length}`, circleId, userId, body, createdAt: t(-days, 12 + (db.messages.length % 8)) });
  msg("cir_mend", "u_maya", "Thanks all for Saturday! Same again in a couple of weeks?", 29);
  msg("cir_mend", "u_dev", "I could host the next one if someone helps with tea.", 28);
  msg("cir_mend", "u_ana", "I'll do tea 🍪", 28);
  msg("cir_mend", "u_lee", "Jeans edition was brilliant. My knee patch survived a bike ride.", 10);
  msg("cir_mend", "u_maya", "Next one's up! Bring something you've been putting off fixing.", 5);
  msg("cir_bread", "u_priya", "My starter is called Doughlores. She's doing great.", 33);
  msg("cir_peck", "u_ife", "Welcome everyone! We're full — tell friends to join the waitlist.", 4);

  db.stories.push(
    {
      id: "sty_mend1",
      circleId: "cir_mend",
      actionId: "act_mend1",
      authorId: "u_maya",
      whatHappened:
        "Seven of us, seven broken things. By 4pm we had two re-sewn buttons, a darned sock, a patched sleeve, a fixed bag strap and one very ambitious zip (still in progress).",
      learned: "Pre-threading needles makes the first ten minutes so much easier. Tea before teaching.",
      next: "Dev offered to host a jeans edition in a fortnight.",
      visibility: "public",
      consents: Object.fromEntries(["u_maya", "u_ana", "u_tom", "u_jo", "u_sam", "u_lee", "u_dev", "u_ben"].map((u) => [u, "granted"])),
      createdAt: t(-29),
      publishedAt: t(-27),
      isSample: true,
    },
    {
      id: "sty_mend2",
      circleId: "cir_mend",
      actionId: "act_mend2",
      authorId: "u_dev",
      whatHappened: "Jeans edition! Six of us, mostly knee holes. Lee turned a rip into a sashiko-style patch.",
      learned: "Denim needles are worth it. Show-and-tell at the end is the best part.",
      next: "Maya is hosting the next one.",
      visibility: "private",
      consents: {},
      createdAt: t(-11),
      isSample: true,
    },
  );

  // ── Campaign events (sample) ───────────────────────────────────────────────
  const ev = (actionId: ID, code: string, channel: "x" | "instagram" | "tiktok" | "link", kind: "visit" | "join" | "share_opened", count: number, days: number) => {
    for (let i = 0; i < count; i++) db.campaignEvents.push({ id: `cev_s${db.campaignEvents.length}`, actionId, code, channel, kind, createdAt: t(-days) });
  };
  ev("act_mend1", "MEND1", "instagram", "visit", 41, 37);
  ev("act_mend1", "MEND1", "instagram", "join", 3, 37);
  ev("act_mend1", "MEND1", "x", "visit", 9, 37);
  ev("act_peck1", "PECK1", "tiktok", "visit", 63, 5);
  ev("act_peck1", "PECK1", "tiktok", "join", 2, 5);
  ev("act_mend3", "MEND3", "link", "share_opened", 2, 4);

  db.supportLogs.push(
    { id: "sup_1", operatorId: "u_ops", minutes: 90, note: "Helped Maya find the library room and plan the first session.", circleId: "cir_mend", createdAt: t(-42) },
    { id: "sup_2", operatorId: "u_ops", minutes: 20, note: "Quick call with Dev before hosting.", circleId: "cir_mend", createdAt: t(-24) },
    { id: "sup_3", operatorId: "u_ops", minutes: 15, note: "Reviewed Ifeoma's adaptation.", circleId: "cir_peck", createdAt: t(-7) },
  );

  // ── Templates ──────────────────────────────────────────────────────────────
  const tpl = (id: string, emoji: string, f: Partial<Template>): Template => ({
    ...REPAIR_FORMAT,
    id,
    emoji,
    attribution: "Pilot template",
    createdBy: "u_ops",
    createdAt: created,
    roles: withIds(id, [roles.welcome, roles.tea, roles.tidy]),
    ...f,
  });
  db.templates.push(
    tpl("tpl_repair", "🧵", { roles: withIds("tpl_repair", [roles.welcome, roles.tea, roles.kit, roles.tidy]) }),
    tpl("tpl_visible", "🪡", {
      title: "Visible mending circle",
      summary: "Turn holes into decoration with simple sashiko-style stitches and bright patches.",
      whatToExpect: "A short demo, then stitch along. Bring a garment with a worn patch; we bring thread and fabric scraps.",
      lessons: ["Pre-cut patches in a few sizes.", "Chalk pencils help people plan their stitches."],
    }),
    tpl("tpl_bike", "🔧", {
      title: "Bike fix-up night",
      summary: "Learn to fix a puncture, adjust brakes and oil a chain — on your own bike.",
      whatToExpect: "Stations for punctures, brakes and gears. Bring your bike; tools and pumps provided.",
      durationMins: 120,
      costLabel: "Free · parts at cost",
      accessibility: "Ground-floor space with step-free access. Bike stands available. Seating available.",
      roles: withIds("tpl_bike", [roles.welcome, roles.kit, roles.tidy]),
      lessons: [],
    }),
    tpl("tpl_bread", "🍞", {
      title: "Bread & starter swap morning",
      summary: "Bring a loaf or a jar of starter. Swap, taste, and learn a simple no-knead recipe.",
      whatToExpect: "Tasting table, a 15-minute demo, and a starter giveaway. Shop-bought bread welcome.",
      category: "cooking",
      durationMins: 120,
      costLabel: "Free",
      lessons: [],
    }),
    tpl("tpl_song", "🎸", {
      title: "Three-chord song circle",
      summary: "Learn three chords and play a whole song together by the end of the evening.",
      whatToExpect: "Loaner instruments, large-print chord sheets, no pressure to sing.",
      category: "music",
      durationMins: 120,
      costLabel: "Free",
      lessons: [],
    }),
    tpl("tpl_plants", "🪴", {
      title: "Seed & cutting swap",
      summary: "Bring seeds, cuttings or spare pots. Leave with something new to grow.",
      whatToExpect: "Swap tables, a quick propagation demo, and labels so nothing gets mixed up.",
      category: "growing",
      durationMins: 90,
      costLabel: "Free",
      lessons: [],
    }),
  );

  return db;
}

export const SAMPLE_PERSONAS: { id: ID; label: string; hint: string }[] = [
  { id: "u_alex", label: "Alex", hint: "New here — join something, then try adapting it" },
  { id: "u_maya", label: "Maya", hint: "Host of Mend & Natter" },
  { id: "u_dev", label: "Dev", hint: "Member who started hosting" },
  { id: "u_ops", label: "Pilot operator", hint: "Reviews hosts, reports, metrics" },
];
