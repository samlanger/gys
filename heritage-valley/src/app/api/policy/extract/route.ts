import { NextResponse } from "next/server";
import { ModelUnavailableError } from "@/lib/claude";
import { getDb } from "@/lib/db";
import { jsonError, requireRole } from "@/lib/http";
import { extractPolicyRules } from "@/lib/policy";

export const maxDuration = 300;

export async function POST(req: Request) {
  const session = await requireRole("editor");
  if (session instanceof NextResponse) return session;

  const { documentId, topic } = (await req.json().catch(() => ({}))) as { documentId?: number; topic?: string };
  if (!documentId || !topic?.trim()) return jsonError("Choose a document and a topic", 400);
  try {
    return NextResponse.json(await extractPolicyRules(await getDb(), documentId, topic, { createdBy: session.email }));
  } catch (err) {
    if (err instanceof ModelUnavailableError) return jsonError(err.message, 502);
    console.error("[policy] extraction failed", err);
    return jsonError("Something went wrong extracting rules.", 500);
  }
}
