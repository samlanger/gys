import type { Action, ActionFormat, Ctx, Db, ID } from "./types";
import { audit, campaignCode, DAY, fail, newId, notify, requireUser, slugify } from "./util";

/**
 * The only fields that travel when a format is adapted. Everything else —
 * venue, address, notes, date, capacity, Circle, participants, roles taken,
 * conversation, stories, feedback, invitations — stays with the original group.
 */
export const ADAPTABLE_FIELDS = [
  "title",
  "summary",
  "whatToExpect",
  "category",
  "durationMins",
  "effort",
  "costLabel",
  "accessibility",
  "roles",
  "lessons",
] as const satisfies readonly (keyof ActionFormat)[];

export function canAdapt(action: Action): boolean {
  return action.allowAdaptation && (action.status === "published" || action.status === "completed");
}

export function copyFormat(source: ActionFormat): ActionFormat {
  const out = {} as Record<string, unknown>;
  for (const k of ADAPTABLE_FIELDS) out[k] = structuredClone(source[k]);
  const format = out as unknown as ActionFormat;
  // Role slots get fresh ids so nothing links back to who held them.
  format.roles = format.roles.map((r) => ({ ...r, id: newId("role") }));
  return format;
}

/** "Try this with your people": copy an authorised format into a fresh draft owned by the new host. */
export function adaptAction(db: Db, ctx: Ctx, sourceId: ID): Action {
  const user = requireUser(db, ctx);
  if (!user.adultConfirmed) fail("forbidden", "The pilot is for adults (18+).");
  const source = db.actions.find((a) => a.id === sourceId);
  if (!source) fail("not_found", "That plan doesn't exist.");
  if (!canAdapt(source)) fail("forbidden", "The host hasn't made this format available to adapt.");

  const start = new Date(ctx.now.getTime() + 14 * DAY);
  start.setHours(14, 0, 0, 0);

  const draft: Action = {
    ...copyFormat(source),
    id: newId("act"),
    slug: slugify(source.title),
    hostId: user.id,
    status: "draft",
    startsAt: start.toISOString(),
    areaLabel: "",
    venueName: "",
    venueAddress: "",
    venueNotes: "",
    capacity: 8,
    visibility: "public",
    allowAdaptation: true,
    // Public attribution is preserved; the original creator isn't implied to endorse the new group.
    sourceUrl: source.sourceUrl,
    sourceCredit: source.sourceCredit,
    adaptedFromId: source.id,
    lineageRootId: source.lineageRootId ?? source.id,
    createdAt: ctx.now.toISOString(),
    campaignCode: campaignCode(),
    founderPrompted: false,
  };
  db.actions.push(draft);
  if (source.hostId !== user.id) {
    notify(db, ctx, source.hostId, `Someone is adapting “${source.title}” for their own group 🌱`, `/a/${source.slug}`);
  }
  audit(db, ctx, "action.adapted", "action", draft.id, { from: source.id, root: draft.lineageRootId });
  return draft;
}

export function lineage(db: Db, action: Action): { origin?: Action; parent?: Action; descendants: number } {
  const parent = action.adaptedFromId ? db.actions.find((a) => a.id === action.adaptedFromId) : undefined;
  const origin = action.lineageRootId ? db.actions.find((a) => a.id === action.lineageRootId) : undefined;
  const rootId = action.lineageRootId ?? action.id;
  const rootCircle = (origin ?? action).circleId;
  // Count other groups that tried this format, not repeats inside the original Circle.
  const descendants = new Set(
    db.actions
      .filter((a) => a.lineageRootId === rootId && a.circleId && a.circleId !== rootCircle)
      .filter((a) => a.status === "published" || a.status === "completed")
      .map((a) => a.circleId),
  ).size;
  return { origin, parent, descendants };
}
