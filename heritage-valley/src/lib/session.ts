/**
 * Signed session cookies. Uses Web Crypto so it runs in both the Node runtime
 * and Next.js middleware.
 */

export const ROLES = ["admin", "facilitator", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export interface Session {
  email: string;
  role: Role;
  exp: number; // epoch seconds
}

export const SESSION_COOKIE = "hv_session";
export const SESSION_DAYS = 14;

const encoder = new TextEncoder();

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be at least 32 characters");
    return "development-only-session-secret-do-not-use";
  }
  return s;
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

export async function signSession(session: Session): Promise<string> {
  const payload = b64url(encoder.encode(JSON.stringify(session)));
  return `${payload}.${b64url(await hmac(payload))}`;
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = b64url(await hmac(payload));
  // Constant-time comparison.
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Session;
    if (!ROLES.includes(session.role) || session.exp < Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

/** Local development without login. Never honored in production. */
export function authDisabled(): boolean {
  return process.env.AUTH_DISABLED === "true" && process.env.NODE_ENV !== "production";
}

export const DEV_SESSION: Session = { email: "dev@localhost", role: "admin", exp: Number.MAX_SAFE_INTEGER };

export function canEdit(session: Session | null): boolean {
  return session?.role === "admin" || session?.role === "facilitator";
}
