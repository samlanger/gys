import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Ctx } from "@/lib/domain/types";
import { getStore } from "@/lib/store";

const COOKIE = "hd_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production" && process.env.DATA_BACKEND === "supabase") {
    throw new Error("SESSION_SECRET must be set (16+ chars) in production.");
  }
  return "demo-only-session-secret-not-for-production";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function encodeSession(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function decodeSession(raw: string | undefined): string | null {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i < 1) return null;
  const id = raw.slice(0, i);
  const given = Buffer.from(raw.slice(i + 1));
  const expected = Buffer.from(sign(id));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return id;
}

export async function setSession(userId: string) {
  (await cookies()).set(COOKIE, encodeSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getCtx(): Promise<Ctx> {
  const id = decodeSession((await cookies()).get(COOKIE)?.value);
  const exists = id ? getStore().read().users.some((u) => u.id === id) : false;
  return { userId: exists ? id : null, now: new Date() };
}
