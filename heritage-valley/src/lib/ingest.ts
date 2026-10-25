import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";
import type { Db } from "./db";
import type { Category, DocType } from "./library";

export const MAX_PASSAGE_CHARS = 1200;

export interface DocumentMeta {
  title: string;
  category: Category;
  docType: DocType;
  geography: string[];
  topics: string[];
  publishedDate: string | null; // YYYY-MM-DD
  owner: string;
  lastVerified?: string; // YYYY-MM-DD, defaults to today
  sourceUrl?: string | null;
  copyrighted?: boolean;
}

export interface IngestResult {
  documentId: number;
  pageCount: number;
  passageCount: number;
  pagesWithoutText: number[];
  duplicate: boolean;
}

export function fileStorageDir(): string {
  return process.env.FILE_STORAGE_DIR || path.join(process.cwd(), "storage", "files");
}

/** Returns one string per page, index 0 = page 1. */
export async function extractPages(pdfBytes: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(pdfBytes));
  const { text } = await extractText(pdf, { mergePages: false });
  return text;
}

/**
 * Splits one page into passages of at most `maxChars`, preferring paragraph and
 * then sentence boundaries. Passages never span pages, so every passage has
 * exactly one page number.
 */
export function chunkPage(pageText: string, maxChars = MAX_PASSAGE_CHARS): string[] {
  const paragraphs = pageText
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const pieces: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      pieces.push(paragraph);
      continue;
    }
    const sentences = paragraph.match(/[^.!?]+(?:[.!?]+|$)\s*/g) ?? [paragraph];
    for (const sentence of sentences) {
      const s = sentence.trim();
      // Hard-wrap pathological sentences (tables, lists without punctuation).
      for (let i = 0; i < s.length; i += maxChars) pieces.push(s.slice(i, i + maxChars));
    }
  }

  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + 1 + piece.length > maxChars) {
      chunks.push(current);
      current = piece;
    } else {
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function validateMeta(meta: DocumentMeta): string[] {
  const errors: string[] = [];
  if (!meta.title?.trim()) errors.push("title is required");
  if (!meta.owner?.trim()) errors.push("owner is required");
  for (const [field, value] of [
    ["publishedDate", meta.publishedDate],
    ["lastVerified", meta.lastVerified],
  ] as const) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push(`${field} must be YYYY-MM-DD`);
  }
  return errors;
}

export async function ingestPdf(
  db: Db,
  pdfBytes: Uint8Array,
  meta: DocumentMeta,
  createdBy: string | null = null,
): Promise<IngestResult> {
  const errors = validateMeta(meta);
  if (errors.length) throw new Error(`Invalid document metadata: ${errors.join("; ")}`);

  const sha256 = crypto.createHash("sha256").update(pdfBytes).digest("hex");
  const existing = await db.query<{ id: number; page_count: number }>(
    `SELECT id, page_count FROM documents WHERE file_sha256 = $1`,
    [sha256],
  );
  if (existing.rows[0]) {
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM passages WHERE document_id = $1`,
      [existing.rows[0].id],
    );
    return {
      documentId: existing.rows[0].id,
      pageCount: existing.rows[0].page_count,
      passageCount: rows[0].n,
      pagesWithoutText: [],
      duplicate: true,
    };
  }

  const pages = await extractPages(pdfBytes);
  const pagesWithoutText = pages.flatMap((t, i) => (t.trim().length < 20 ? [i + 1] : []));

  // Keep the original file so citations can open the exact page.
  const relativePath = `${sha256}.pdf`;
  await fs.mkdir(fileStorageDir(), { recursive: true });
  await fs.writeFile(path.join(fileStorageDir(), relativePath), pdfBytes);

  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO documents (title, category, doc_type, geography, topics, published_date, owner,
        last_verified, source_url, file_path, file_sha256, page_count, pages_without_text, copyrighted, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::date, CURRENT_DATE),$9,$10,$11,$12,$13,$14,$15)
     RETURNING id`,
    [
      meta.title.trim(),
      meta.category,
      meta.docType,
      meta.geography,
      meta.topics,
      meta.publishedDate,
      meta.owner.trim(),
      meta.lastVerified ?? null,
      meta.sourceUrl ?? null,
      relativePath,
      sha256,
      pages.length,
      pagesWithoutText.length,
      meta.copyrighted ?? false,
      createdBy,
    ],
  );
  const documentId = rows[0].id;

  let passageCount = 0;
  for (const [i, pageText] of pages.entries()) {
    for (const [chunkIndex, text] of chunkPage(pageText).entries()) {
      await db.query(
        `INSERT INTO passages (document_id, page_number, chunk_index, text) VALUES ($1,$2,$3,$4)`,
        [documentId, i + 1, chunkIndex, text],
      );
      passageCount++;
    }
  }

  return { documentId, pageCount: pages.length, passageCount, pagesWithoutText, duplicate: false };
}
