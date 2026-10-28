import type { Action, Ctx, Db, ID } from "@/lib/domain/types";
import {
  canManageAction,
  canSeePrivateDetails,
  isCircleMember,
  isOperator,
  liveRsvp,
} from "@/lib/domain/access";
import { confirmedCount, roleTaken, waitlistPosition } from "@/lib/domain/join";
import { canAdapt, lineage } from "@/lib/domain/adapt";

/**
 * Server-side serialisers. Pages pass these (never raw records) to client
 * components, so private fields only leave the server for authorised viewers.
 */
export function buildPublicView(db: Db, ctx: Ctx, action: Action) {
  const uid = ctx.userId;
  const rsvp = liveRsvp(db, action.id, uid);
  const confirmed = confirmedCount(db, action.id);
  const waitlist = db.rsvps.filter((r) => r.actionId === action.id && r.status === "waitlisted").length;
  const manage = canManageAction(db, action, uid);
  const member = isCircleMember(db, action.circleId, uid);
  const insider = manage || member || rsvp?.status === "confirmed" || isOperator(db, uid);
  const host = db.users.find((u) => u.id === action.hostId);
  const circle = db.circles.find((c) => c.id === action.circleId);
  const lin = lineage(db, action);
  const originCircle = lin.origin ? db.circles.find((c) => c.id === lin.origin!.circleId) : undefined;
  const people = db.rsvps
    .filter((r) => r.actionId === action.id && r.status === "confirmed")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r) => {
      const u = db.users.find((x) => x.id === r.userId);
      const role = action.roles.find((x) => x.id === r.roleSlotId);
      return insider ? { name: u?.name ?? "Someone", role: role ? `${role.emoji} ${role.name}` : undefined } : { name: "", role: undefined };
    });

  return {
    id: action.id,
    slug: action.slug,
    status: action.status,
    title: action.title,
    summary: action.summary,
    whatToExpect: action.whatToExpect,
    category: action.category,
    startsAt: action.startsAt,
    durationMins: action.durationMins,
    effort: action.effort,
    costLabel: action.costLabel,
    accessibility: action.accessibility,
    areaLabel: action.areaLabel,
    venueName: action.venueName,
    capacity: action.capacity,
    confirmed,
    spotsLeft: Math.max(0, action.capacity - confirmed),
    waitlist,
    visibility: action.visibility,
    lessons: action.lessons,
    sourceUrl: action.sourceUrl,
    sourceCredit: action.sourceCredit,
    cancelReason: action.status === "cancelled" ? action.cancelReason : undefined,
    isSample: !!action.isSample,
    adaptable: canAdapt(action),
    host: { id: action.hostId, name: host?.name ?? "A host", bio: host?.bio },
    circle: circle && insider ? { id: circle.id, name: circle.name, emoji: circle.emoji } : undefined,
    lineage: {
      origin:
        lin.origin && lin.origin.id !== action.id && lin.origin.circleId !== action.circleId
          ? { title: lin.origin.title, slug: lin.origin.slug, circleName: originCircle?.name }
          : undefined,
      descendants: lin.descendants,
    },
    roles: action.roles.map((r) => ({
      ...r,
      taken: roleTaken(db, action.id, r.id),
      mine: rsvp?.roleSlotId === r.id,
    })),
    people,
    viewer: {
      signedIn: !!uid,
      rsvpStatus: rsvp?.status as "confirmed" | "waitlisted" | undefined,
      roleSlotId: rsvp?.roleSlotId,
      waitlistPosition: rsvp?.status === "waitlisted" ? waitlistPosition(db, rsvp) : undefined,
      attendance: rsvp?.attendance,
      hasFeedback: !!uid && db.feedback.some((f) => f.actionId === action.id && f.userId === uid),
      canManage: manage,
      isMember: member,
      isHost: action.hostId === uid,
    },
    private: canSeePrivateDetails(db, action, uid)
      ? { venueAddress: action.venueAddress, venueNotes: action.venueNotes }
      : undefined,
  };
}

export type ActionView = ReturnType<typeof buildPublicView>;

export function userName(db: Db, id: ID): string {
  return db.users.find((u) => u.id === id)?.name ?? "Someone";
}

export function actionCardData(db: Db, a: Action) {
  const confirmed = confirmedCount(db, a.id);
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    startsAt: a.startsAt,
    areaLabel: a.areaLabel,
    costLabel: a.costLabel,
    category: a.category,
    effort: a.effort,
    status: a.status,
    spotsLeft: Math.max(0, a.capacity - confirmed),
    capacity: a.capacity,
    confirmed,
    hostName: userName(db, a.hostId),
    isSample: !!a.isSample,
    adapted: !!a.adaptedFromId,
  };
}

export type ActionCardData = ReturnType<typeof actionCardData>;
