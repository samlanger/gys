import type { Action, Channel, Ctx, Db, ID, Invitation, Rsvp } from "./types";
import { canManageAction, canViewAction, isCircleMember, liveRsvp, validInvitation } from "./access";
import { audit, DAY, fail, newId, notify, randomId, requireUser } from "./util";

export function confirmedCount(db: Db, actionId: ID): number {
  return db.rsvps.filter((r) => r.actionId === actionId && r.status === "confirmed").length;
}

export function roleTaken(db: Db, actionId: ID, roleSlotId: ID): number {
  return db.rsvps.filter((r) => r.actionId === actionId && r.status === "confirmed" && r.roleSlotId === roleSlotId).length;
}

function getAction(db: Db, id: ID): Action {
  const a = db.actions.find((x) => x.id === id);
  if (!a) fail("not_found", "That plan doesn't exist.");
  return a;
}

function addMember(db: Db, ctx: Ctx, circleId: ID | undefined, userId: ID) {
  if (!circleId || isCircleMember(db, circleId, userId)) return;
  const old = db.memberships.find((m) => m.circleId === circleId && m.userId === userId);
  if (old) {
    old.leftAt = undefined;
    old.joinedAt = ctx.now.toISOString();
  } else {
    db.memberships.push({ circleId, userId, role: "member", joinedAt: ctx.now.toISOString() });
  }
}

export interface JoinResult {
  rsvp: Rsvp;
  status: "confirmed" | "waitlisted";
  alreadyJoined: boolean;
  roleAssigned: boolean;
  waitlistPosition?: number;
}

export function waitlistPosition(db: Db, rsvp: Rsvp): number {
  const list = db.rsvps
    .filter((r) => r.actionId === rsvp.actionId && r.status === "waitlisted")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return list.findIndex((r) => r.id === rsvp.id) + 1;
}

/**
 * Join an action. Must run inside a store transaction: the capacity check and
 * the write happen against the same locked snapshot, so simultaneous requests
 * can't overfill a plan (Postgres: see join_action() in migrations).
 */
export function joinAction(
  db: Db,
  ctx: Ctx,
  actionId: ID,
  opts: { inviteToken?: string; roleSlotId?: ID; campaignCode?: string; channel?: Channel } = {},
): JoinResult {
  const user = requireUser(db, ctx);
  if (!user.adultConfirmed) fail("forbidden", "The pilot is for adults (18+).");
  const action = getAction(db, actionId);
  if (action.status !== "published") {
    fail("conflict", action.status === "cancelled" ? "This plan was cancelled." : "This plan isn't open for joining.");
  }
  if (new Date(action.startsAt).getTime() <= ctx.now.getTime()) fail("conflict", "This has already started.");
  if (!canViewAction(db, action, ctx, opts.inviteToken)) {
    fail(opts.inviteToken ? "expired" : "forbidden", opts.inviteToken ? "This invitation has expired." : "This plan is invite-only.");
  }

  const existing = liveRsvp(db, actionId, user.id);
  if (existing) {
    return {
      rsvp: existing,
      status: existing.status as "confirmed" | "waitlisted",
      alreadyJoined: true,
      roleAssigned: !!existing.roleSlotId,
      waitlistPosition: existing.status === "waitlisted" ? waitlistPosition(db, existing) : undefined,
    };
  }

  // Invite-only: consume one use of the invitation (circle members don't need one).
  if (action.visibility === "invite" && action.hostId !== user.id && !isCircleMember(db, action.circleId, user.id)) {
    const inv = validInvitation(db, actionId, opts.inviteToken, ctx.now);
    if (!inv) fail("expired", "This invitation has expired.");
    inv.uses += 1;
  }

  const hasRoom = confirmedCount(db, actionId) < action.capacity;
  const rsvp: Rsvp = {
    id: newId("rsvp"),
    actionId,
    userId: user.id,
    status: hasRoom ? "confirmed" : "waitlisted",
    createdAt: ctx.now.toISOString(),
    campaignCode: opts.campaignCode,
    channel: opts.channel ?? (opts.campaignCode ? "unknown" : undefined),
    attendance: "unknown",
  };

  let roleAssigned = false;
  if (hasRoom && opts.roleSlotId) {
    const slot = action.roles.find((r) => r.id === opts.roleSlotId);
    if (slot && roleTaken(db, actionId, slot.id) < slot.capacity) {
      rsvp.roleSlotId = slot.id;
      roleAssigned = true;
    }
  }
  db.rsvps.push(rsvp);
  if (hasRoom) addMember(db, ctx, action.circleId, user.id);

  if (opts.campaignCode) {
    db.campaignEvents.push({
      id: newId("cev"),
      actionId,
      code: opts.campaignCode,
      channel: rsvp.channel ?? "unknown",
      kind: "join",
      userId: user.id,
      createdAt: ctx.now.toISOString(),
    });
  }
  if (action.hostId !== user.id) {
    notify(
      db,
      ctx,
      action.hostId,
      hasRoom ? `${user.name} joined “${action.title}” 🎉` : `${user.name} joined the waitlist for “${action.title}”`,
      `/plan/${action.id}/manage`,
    );
  }
  audit(db, ctx, `rsvp.${rsvp.status}`, "action", actionId);
  return {
    rsvp,
    status: rsvp.status as "confirmed" | "waitlisted",
    alreadyJoined: false,
    roleAssigned,
    waitlistPosition: hasRoom ? undefined : waitlistPosition(db, rsvp),
  };
}

export function promoteFromWaitlist(db: Db, ctx: Ctx, action: Action): Rsvp[] {
  const promoted: Rsvp[] = [];
  if (action.status !== "published") return promoted;
  const queue = db.rsvps
    .filter((r) => r.actionId === action.id && r.status === "waitlisted")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const r of queue) {
    if (confirmedCount(db, action.id) >= action.capacity) break;
    r.status = "confirmed";
    r.promotedAt = ctx.now.toISOString();
    addMember(db, ctx, action.circleId, r.userId);
    notify(db, ctx, r.userId, `A spot opened up — you're in for “${action.title}”! 🎉`, `/a/${action.slug}`);
    audit(db, ctx, "rsvp.promoted", "rsvp", r.id);
    promoted.push(r);
  }
  return promoted;
}

export function leaveAction(db: Db, ctx: Ctx, actionId: ID): void {
  const user = requireUser(db, ctx);
  const action = getAction(db, actionId);
  const rsvp = liveRsvp(db, actionId, user.id);
  if (!rsvp) fail("not_found", "You're not on this plan.");
  const wasConfirmed = rsvp.status === "confirmed";
  rsvp.status = "cancelled";
  rsvp.cancelledAt = ctx.now.toISOString();
  rsvp.roleSlotId = undefined;
  if (wasConfirmed) promoteFromWaitlist(db, ctx, action);
  if (action.hostId !== user.id) {
    notify(db, ctx, action.hostId, `${user.name} can't make “${action.title}” any more.`, `/plan/${action.id}/manage`);
  }
  audit(db, ctx, "rsvp.cancelled", "action", actionId);
}

export function chooseRole(db: Db, ctx: Ctx, actionId: ID, roleSlotId: ID | null): void {
  const user = requireUser(db, ctx);
  const action = getAction(db, actionId);
  const rsvp = liveRsvp(db, actionId, user.id);
  if (!rsvp || rsvp.status !== "confirmed") fail("forbidden", "Roles are for confirmed participants.");
  if (roleSlotId === null) {
    rsvp.roleSlotId = undefined;
    return;
  }
  const slot = action.roles.find((r) => r.id === roleSlotId);
  if (!slot) fail("not_found", "That role doesn't exist.");
  if (rsvp.roleSlotId === slot.id) return;
  if (roleTaken(db, actionId, slot.id) >= slot.capacity) fail("conflict", "Someone just took that role — pick another?");
  rsvp.roleSlotId = slot.id;
  audit(db, ctx, "rsvp.role_chosen", "rsvp", rsvp.id, { roleSlotId });
}

export function hostAssignRole(db: Db, ctx: Ctx, rsvpId: ID, roleSlotId: ID | null): void {
  const user = requireUser(db, ctx);
  const rsvp = db.rsvps.find((r) => r.id === rsvpId);
  if (!rsvp) fail("not_found", "Not found.");
  const action = getAction(db, rsvp.actionId);
  if (!canManageAction(db, action, user.id)) fail("forbidden", "Only the host can assign roles.");
  if (rsvp.status !== "confirmed") fail("conflict", "Only confirmed participants can take roles.");
  if (roleSlotId === null) {
    rsvp.roleSlotId = undefined;
  } else {
    const slot = action.roles.find((r) => r.id === roleSlotId);
    if (!slot) fail("not_found", "That role doesn't exist.");
    if (rsvp.roleSlotId !== slot.id && roleTaken(db, action.id, slot.id) >= slot.capacity) fail("conflict", "That role is full.");
    rsvp.roleSlotId = slot.id;
    notify(db, ctx, rsvp.userId, `${user.name} asked if you'd take “${slot.name}” ${slot.emoji}`, `/a/${action.slug}`);
  }
  audit(db, ctx, "rsvp.role_assigned", "rsvp", rsvpId, { roleSlotId });
}

export function createInvitation(db: Db, ctx: Ctx, actionId: ID, opts: { days?: number; maxUses?: number } = {}): Invitation {
  const user = requireUser(db, ctx);
  const action = getAction(db, actionId);
  if (!canManageAction(db, action, user.id)) fail("forbidden", "Only the host can create invitations.");
  const days = Math.min(Math.max(opts.days ?? 7, 1), 30);
  const inv: Invitation = {
    id: newId("inv"),
    actionId,
    token: randomId(16),
    createdBy: user.id,
    createdAt: ctx.now.toISOString(),
    expiresAt: new Date(ctx.now.getTime() + days * DAY).toISOString(),
    maxUses: Math.min(Math.max(opts.maxUses ?? 20, 1), 100),
    uses: 0,
  };
  db.invitations.push(inv);
  audit(db, ctx, "invitation.created", "action", actionId, { days });
  return inv;
}

export function revokeInvitation(db: Db, ctx: Ctx, invitationId: ID): void {
  const user = requireUser(db, ctx);
  const inv = db.invitations.find((i) => i.id === invitationId);
  if (!inv) fail("not_found", "Not found.");
  const action = getAction(db, inv.actionId);
  if (!canManageAction(db, action, user.id)) fail("forbidden", "Only the host can revoke invitations.");
  inv.revokedAt = ctx.now.toISOString();
  audit(db, ctx, "invitation.revoked", "invitation", inv.id);
}

/** Attendance is self-reported by participants or confirmed by the host — never inferred from an RSVP. */
export function reportAttendance(db: Db, ctx: Ctx, actionId: ID, attended: boolean): void {
  const user = requireUser(db, ctx);
  const action = getAction(db, actionId);
  if (new Date(action.startsAt).getTime() > ctx.now.getTime()) fail("conflict", "It hasn't happened yet.");
  const rsvp = liveRsvp(db, actionId, user.id);
  if (!rsvp || rsvp.status !== "confirmed") fail("forbidden", "Only confirmed participants can report attendance.");
  if (rsvp.attendance === "host_confirmed" && attended) return;
  rsvp.attendance = attended ? "self_reported" : "absent";
}

export function hostMarkAttendance(db: Db, ctx: Ctx, rsvpId: ID, attended: boolean): void {
  const user = requireUser(db, ctx);
  const rsvp = db.rsvps.find((r) => r.id === rsvpId);
  if (!rsvp) fail("not_found", "Not found.");
  const action = getAction(db, rsvp.actionId);
  if (!canManageAction(db, action, user.id)) fail("forbidden", "Only the host can mark attendance.");
  rsvp.attendance = attended ? "host_confirmed" : "absent";
}
