import fs from "node:fs/promises";
import path from "node:path";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { fileStorageDir } from "@/lib/ingest";
import { getDocument } from "@/lib/library";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const doc = await getDocument(await getDb(), Number((await params).id));
  if (!doc) return jsonError("Document not found", 404);
  // Copyrighted works are cited by page and short quote, never displayed in full.
  if (doc.copyrighted) return jsonError("This is a copyrighted work. See the cited page in the original publication.", 403);

  const bytes = await fs.readFile(path.join(fileStorageDir(), path.basename(doc.file_path)));
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.title)}.pdf"`,
    },
  });
}
