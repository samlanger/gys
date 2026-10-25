import { NextResponse } from "next/server";
import { consumeLoginToken } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, SESSION_DAYS, signSession } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const next = url.searchParams.get("next");
  const user = token ? await consumeLoginToken(await getDb(), token) : null;
  if (!user) return NextResponse.redirect(new URL("/login?error=expired", req.url));

  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const res = NextResponse.redirect(new URL(next?.startsWith("/") && !next.startsWith("//") ? next : "/", req.url));
  res.cookies.set(SESSION_COOKIE, await signSession({ ...user, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return res;
}
