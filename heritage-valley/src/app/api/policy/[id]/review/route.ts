import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/http";
import { markReviewed } from "@/lib/policy";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin");
  if (session instanceof NextResponse) return session;
  const { reviewer } = (await req.json().catch(() => ({}))) as { reviewer?: string };
  // Record the named counsel who reviewed it, and who entered the sign-off.
  const name = reviewer?.trim() ? `${reviewer.trim()} (recorded by ${session.email})` : session.email;
  await markReviewed(await getDb(), Number((await params).id), name);
  return NextResponse.json({ ok: true });
}
