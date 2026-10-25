import { NextResponse } from "next/server";
import { askLibrary } from "@/lib/ask";
import { ModelUnavailableError } from "@/lib/claude";
import { getDb } from "@/lib/db";
import { jsonError, requireRole } from "@/lib/http";

export const maxDuration = 300;

export async function POST(req: Request) {
  const session = await requireRole("any");
  if (session instanceof NextResponse) return session;

  const { question } = (await req.json().catch(() => ({}))) as { question?: string };
  if (!question?.trim()) return jsonError("Ask a question", 400);
  if (question.length > 1000) return jsonError("Keep questions under 1,000 characters", 400);

  try {
    const record = await askLibrary(await getDb(), question, { askedBy: session.email });
    return NextResponse.json(record);
  } catch (err) {
    if (err instanceof ModelUnavailableError) return jsonError(err.message, 502);
    console.error("[ask] failed", err);
    return jsonError("Something went wrong answering this question.", 500);
  }
}
