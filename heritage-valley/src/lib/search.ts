import type { Db } from "./db";
import { isDated, toIsoDate } from "./library";

export interface Passage {
  id: number;
  documentId: number;
  documentTitle: string;
  pageNumber: number;
  text: string;
  publishedDate: string | null;
  dated: boolean;
  copyrighted: boolean;
  rank: number;
}

/**
 * Turns a plain-language question into an OR'd tsquery over its words, so a
 * passage needs to match some of the question rather than all of it.
 * Postgres drops English stop words itself.
 */
export function toOrQuery(question: string): string | null {
  const words = Array.from(
    new Set(question.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? []),
  )
    .map((w) => w.replace(/'/g, ""))
    .filter((w) => w.length > 1);
  return words.length ? words.join(" | ") : null;
}

/**
 * Full-text retrieval over passages, best match first. pgvector semantic
 * search can be added alongside this; full text is kept either way because it
 * finds exact section numbers and defined terms that embeddings miss.
 */
export async function searchPassages(
  db: Db,
  question: string,
  opts: { limit?: number; documentId?: number } = {},
): Promise<Passage[]> {
  const query = toOrQuery(question);
  if (!query) return [];
  const { rows } = await db.query<Record<string, unknown>>(
    `SELECT p.id, p.document_id, p.page_number, p.text,
            d.title, d.published_date, d.last_verified, d.copyrighted,
            ts_rank_cd(p.tsv, q) AS rank
       FROM passages p
       JOIN documents d ON d.id = p.document_id,
            to_tsquery('english', $1) q
      WHERE p.tsv @@ q AND ($3::int IS NULL OR p.document_id = $3)
      ORDER BY rank DESC, p.id
      LIMIT $2`,
    [query, opts.limit ?? 10, opts.documentId ?? null],
  );
  return rows.map((r) => {
    const publishedDate = toIsoDate(r.published_date);
    return {
      id: Number(r.id),
      documentId: Number(r.document_id),
      documentTitle: String(r.title),
      pageNumber: Number(r.page_number),
      text: String(r.text),
      publishedDate,
      dated: isDated({ published_date: publishedDate, last_verified: toIsoDate(r.last_verified)! }),
      copyrighted: Boolean(r.copyrighted),
      rank: Number(r.rank),
    };
  });
}
