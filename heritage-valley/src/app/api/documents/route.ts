import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, requireRole } from "@/lib/http";
import { ingestPdf } from "@/lib/ingest";
import { CATEGORIES, DOC_TYPES, type Category, type DocType } from "@/lib/library";

export const maxDuration = 300;

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export async function POST(req: Request) {
  const session = await requireRole("editor");
  if (session instanceof NextResponse) return session;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf") return jsonError("Upload a PDF file", 400);

  const category = String(form.get("category")) as Category;
  const docType = String(form.get("docType")) as DocType;
  if (!(category in CATEGORIES)) return jsonError("Choose a category", 400);
  if (!DOC_TYPES.includes(docType)) return jsonError("Choose a document type", 400);

  try {
    const result = await ingestPdf(
      await getDb(),
      new Uint8Array(await file.arrayBuffer()),
      {
        title: String(form.get("title") ?? ""),
        category,
        docType,
        geography: list(form.get("geography")),
        topics: list(form.get("topics")),
        publishedDate: String(form.get("publishedDate") ?? "") || null,
        owner: String(form.get("owner") ?? ""),
        lastVerified: String(form.get("lastVerified") ?? "") || undefined,
        sourceUrl: String(form.get("sourceUrl") ?? "") || null,
        copyrighted: form.get("copyrighted") === "on",
      },
      session.email,
    );
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not ingest this file", 400);
  }
}
