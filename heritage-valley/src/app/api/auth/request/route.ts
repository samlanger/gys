import { NextResponse } from "next/server";
import { createLoginToken, deliverLoginLink } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  const { email, next } = (await req.json().catch(() => ({}))) as { email?: string; next?: string };
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter an email address" }, { status: 400 });

  const token = await createLoginToken(await getDb(), email);
  if (token) {
    const base = process.env.APP_URL ?? new URL(req.url).origin;
    const link = new URL("/api/auth/verify", base);
    link.searchParams.set("token", token);
    if (next?.startsWith("/")) link.searchParams.set("next", next);
    await deliverLoginLink(email, link.toString());
  }
  // Same response either way, so the allowlist is not disclosed.
  return NextResponse.json({ ok: true });
}
