import type { Action, Ctx, Db, ID, Invitation, Rsvp } from "./types";
import { fail } from "./util";

export function activeMembership(db: Db, circleId: ID | undefined, userId: ID | null) {
  if (!circleId || !userId) return undefined;
  return db.memberships.find((m) => m.circleId === circleId && m.userId === userId && !m.leftAt);
}

export function isCircleMember(db: Db, circleId: ID | undefined, userId: ID | null): boolean {
  return !!activeMembership(db, circleId, userId);
}

export function isOperator(db: Db, userId: ID | null): boolean {
  return !!userId && !!db.users.find((u) => u.id === userId)?.isOperator;
}

export function liveRsvp(db: Db, actionId: ID, userId: ID | null): Rsvp | undefined {
  if (!userId) return undefined;
  return db.rsvps.find((r) => r.actionId === actionId && r.userId === userId && r.status !== "cancelled");
}

export function canManageAction(db: Db, action: Action, userId: ID | null): boolean {
  if (!userId) return false;
  if (action.hostId === userId) return true;
  const m = activeMembership(db, action.circleId, userId);
  return m?.role === "host" && action.status !== "draft";
}

export function validInvitation(db: Db, actionId: ID, token: string | undefined, now: Date): Invitation | undefined {
  if (!token) return undefined;
  const inv = db.invitations.find((i) => i.actionId === actionId && i.token === token);
  if (!inv) return undefined;
  if (inv.revokedAt) return undefined;
  if (new Date(inv.expiresAt).getTime() <= now.getTime()) return undefined;
  if (inv.uses >= inv.maxUses) return undefined;
  return inv;
}

export type InviteState = "valid" | "expired" | "missing";

export function invitationState(db: Db, actionId: ID, token: string | undefined, now: Date): InviteState {
  if (!token) return "missing";
  return validInvitation(db, actionId, token, now) ? "valid" : "expired";
}

/** Can this viewer see the public page of the action at all? */
export function canViewAction(db: Db, action: Action, ctx: Ctx, inviteToken?: string): boolean {
  const uid = ctx.userId;
  if (action.status === "draft" || action.status === "in_review") {
    return action.hostId === uid || isOperator(db, uid);
  }
  if (action.visibility === "public") return true;
  if (action.hostId === uid || isOperator(db, uid)) return true;
  if (liveRsvp(db, action.id, uid)) return true;
  if (isCircleMember(db, action.circleId, uid)) return true;
  return !!validInvitation(db, action.id, inviteToken, ctx.now);
}

/** Exact venue and arrival notes: confirmed participants, managers, operators. Never waitlist or public. */
export function canSeePrivateDetails(db: Db, action: Action, userId: ID | null): boolean {
  if (!userId) return false;
  if (canManageAction(db, action, userId) || isOperator(db, userId)) return true;
  return liveRsvp(db, action.id, userId)?.status === "confirmed";
}

export function assertCircleAccess(db: Db, circleId: ID, userId: ID | null): void {
  if (!userId) fail("unauthenticated", "Please sign in first.");
  if (!isCircleMember(db, circleId, userId)) fail("forbidden", "This Circle is private to its members.");
}
