import type { AuditEvent, Ctx, Db, ID, Notification, User } from "./types";

export class DomainError extends Error {
  constructor(
    public code:
      | "unauthenticated"
      | "forbidden"
      | "not_found"
      | "invalid"
      | "conflict"
      | "expired",
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function fail(code: DomainError["code"], message: string): never {
  throw new DomainError(code, message);
}

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function randomId(len = 12): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function newId(prefix: string): ID {
  return `${prefix}_${randomId(10)}`;
}

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "plan"}-${randomId(4)}`;
}

export function campaignCode(): string {
  return randomId(6).toUpperCase();
}

export function requireUser(db: Db, ctx: Ctx): User {
  if (!ctx.userId) fail("unauthenticated", "Please sign in first.");
  const user = db.users.find((u) => u.id === ctx.userId);
  if (!user) fail("unauthenticated", "Please sign in again.");
  if (user.deletionRequestedAt) fail("forbidden", "This account is scheduled for deletion.");
  return user;
}

export function requireOperator(db: Db, ctx: Ctx): User {
  const user = requireUser(db, ctx);
  if (!user.isOperator) fail("forbidden", "Operators only.");
  return user;
}

export function audit(
  db: Db,
  ctx: Ctx,
  action: string,
  targetType: string,
  targetId: ID,
  meta?: Record<string, unknown>,
): void {
  const ev: AuditEvent = {
    id: newId("aud"),
    actorId: ctx.userId ?? "system",
    action,
    targetType,
    targetId,
    meta,
    at: ctx.now.toISOString(),
  };
  db.audit.push(ev);
}

export function notify(db: Db, ctx: Ctx, userId: ID, text: string, href: string): void {
  const n: Notification = {
    id: newId("ntf"),
    userId,
    text,
    href,
    createdAt: ctx.now.toISOString(),
  };
  db.notifications.push(n);
}

export function clampText(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, max);
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function emptyDb(): Db {
  return {
    version: 1,
    users: [],
    circles: [],
    memberships: [],
    actions: [],
    rsvps: [],
    invitations: [],
    stories: [],
    feedback: [],
    appreciations: [],
    messages: [],
    campaignEvents: [],
    reports: [],
    appeals: [],
    notifications: [],
    supportLogs: [],
    templates: [],
    audit: [],
  };
}

export const DAY = 24 * 60 * 60 * 1000;
