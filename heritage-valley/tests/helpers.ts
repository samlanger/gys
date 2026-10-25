import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { applySchema, wrapPglite, type Db } from "@/lib/db";

export async function testDb(): Promise<Db> {
  const db = wrapPglite(new PGlite());
  await applySchema(db);
  return db;
}

export async function useTempStorage(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hv-files-"));
  process.env.FILE_STORAGE_DIR = dir;
  return dir;
}

/** Builds a PDF with one page per entry; each entry is a list of lines. */
export async function makePdf(pages: string[][]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = pdf.addPage([612, 792]);
    lines.forEach((line, i) => page.drawText(line, { x: 50, y: 740 - i * 16, size: 11, font }));
  }
  return pdf.save();
}
