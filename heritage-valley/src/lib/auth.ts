import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { Db } from "./db";
import {
  authDisabled,
  DEV_SESSION,
  ROLES,
  SESSION_COOKIE,
  verifySession,
  type Role,
  type Session,
} from "./session";

export const TOKEN_MINUTES = 15;

/** Pilot allowlist from PILOT_USERS="a@x.org:admin,b@y.org:viewer". */
export function pilotUsers(env = process.env.PILOT_USERS ?? ""): Map<string, Role> {
  const users = new Map<string, Role>();
  for (const entry of env.split(",")) {
    const [email, role = "viewer"] = entry.trim().split(":");
    if (email && (ROLES as readonly string[]).includes(role)) users.set(email.toLowerCase(), role as Role);
  }
  return users;
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** Creates a single-use login token for an allowlisted email, or null. */
export async function createLoginToken(db: Db, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!pilotUsers().has(normalized)) return null;
  const token = crypto.randomBytes(32).toString("base64url");
  await db.query(
    `INSERT INTO login_tokens (token_hash, email, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [hashToken(token), normalized, TOKEN_MINUTES],
  );
  return token;
}

/** Consumes a login token. Returns the email and role it grants, or null. */
export async function consumeLoginToken(db: Db, token: string): Promise<{ email: string; role: Role } | null> {
  const { rows } = await db.query<{ email: string }>(
    `UPDATE login_tokens SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING email`,
    [hashToken(token)],
  );
  const email = rows[0]?.email;
  const role = email ? pilotUsers().get(email) : undefined;
  return email && role ? { email, role } : null;
}

/** Sends the magic link. Without an email provider configured, it is logged for the operator. */
export async function deliverLoginLink(email: string, link: string): Promise<void> {
  // TODO(pilot): send through the county's mail service once IT confirms one.
  console.info(`[auth] Login link for ${email}: ${link}`);
}

export async function currentSession(): Promise<Session | null> {
  if (authDisabled()) return DEV_SESSION;
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
