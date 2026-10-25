import type { Db } from "./db";

export const CATEGORIES = {
  plans_law: "Plans and law",
  tourism_economics: "Tourism economics",
  economy_people: "Economy and people",
  agriculture: "Agriculture",
  local_studies: "Local studies",
  case_studies: "Case studies",
} as const;
export type Category = keyof typeof CATEGORIES;

export const DOC_TYPES = ["plan", "code", "ordinance", "report", "study", "minutes", "book", "dataset"] as const;
export type DocType = (typeof DOC_TYPES)[number];

/** Documents older than this are flagged as dated (SPEC: ingestion rules). */
export const DATED_AFTER_YEARS = 5;

export interface DocumentRow {
  id: number;
  title: string;
  category: Category;
  doc_type: DocType;
  geography: string[];
  topics: string[];
  published_date: string | null;
  owner: string;
  last_verified: string;
  source_url: string | null;
  file_path: string;
  page_count: number;
  pages_without_text: number;
  copyrighted: boolean;
  created_by: string | null;
  created_at: string;
}

/** Normalizes DATE columns, which pg returns as Date and PGlite as Date or string. */
export function toIsoDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/**
 * A document is dated when its publication date (or, if unknown, its last
 * verification) is more than DATED_AFTER_YEARS before `now`.
 */
export function isDated(
  doc: { published_date: string | null; last_verified: string },
  now: Date = new Date(),
): boolean {
  const reference = doc.published_date ?? doc.last_verified;
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - DATED_AFTER_YEARS);
  return new Date(`${reference}T00:00:00Z`) < cutoff;
}

function normalizeDoc(row: Record<string, unknown>): DocumentRow {
  return {
    ...(row as unknown as DocumentRow),
    published_date: toIsoDate(row.published_date),
    last_verified: toIsoDate(row.last_verified)!,
    created_at: String(row.created_at),
  };
}

export async function listDocuments(db: Db): Promise<DocumentRow[]> {
  const { rows } = await db.query(
    `SELECT * FROM documents ORDER BY category, published_date DESC NULLS LAST, title`,
  );
  return rows.map(normalizeDoc);
}

export async function getDocument(db: Db, id: number): Promise<DocumentRow | null> {
  const { rows } = await db.query(`SELECT * FROM documents WHERE id = $1`, [id]);
  return rows[0] ? normalizeDoc(rows[0]) : null;
}

/** Link that opens the original file at the cited page. */
export function pageLink(documentId: number, page: number): string {
  return `/api/files/${documentId}#page=${page}`;
}
