import type { Db } from "./db";
import {
  AnswerDraft,
  passageLabel,
  rejectionFeedback,
  validateAnswer,
  type ValidatedAnswer,
} from "./citations";
import { generateStructured, type StructuredGenerator } from "./claude";
import { loadPrompt, PROMPTS } from "./prompts";
import { searchPassages, type Passage } from "./search";

export const RETRIEVAL_LIMIT = 10;

export interface AskRecord {
  id: number;
  question: string;
  answer: ValidatedAnswer;
  promptVersion: string;
  model: string | null;
  askedBy: string | null;
  createdAt: string;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function formatPassages(passages: Passage[]): string {
  const body = passages
    .map(
      (p, i) =>
        `<passage id="${passageLabel(i)}" document="${escapeAttr(p.documentTitle)}" page="${p.pageNumber}" published="${p.publishedDate ?? "unknown"}" dated="${p.dated ? "yes" : "no"}">\n${p.text}\n</passage>`,
    )
    .join("\n");
  return `<passages>\n${body}\n</passages>`;
}

const notFound = (notCovered: string[] = []): ValidatedAnswer => ({
  status: "not_found",
  summary: [],
  details: [],
  notCovered,
  rejected: [],
});

/**
 * Answers a question from the library. Retrieval → Claude → citation checks;
 * if any claim fails the checks the model gets one chance to fix it, and
 * whatever still fails is dropped (and shown as removed). Every answer,
 * including "not found", is written to the audit log.
 */
export async function askLibrary(
  db: Db,
  question: string,
  opts: { askedBy?: string | null; generate?: StructuredGenerator } = {},
): Promise<AskRecord> {
  const generate = opts.generate ?? generateStructured;
  const trimmed = question.trim();
  if (!trimmed) throw new Error("Question is empty");

  const passages = await searchPassages(db, trimmed, { limit: RETRIEVAL_LIMIT });
  let answer: ValidatedAnswer;
  let model: string | null = null;

  if (!passages.length) {
    answer = notFound(["No passages in the library matched this question."]);
  } else {
    const system = loadPrompt(PROMPTS.askLibrary);
    const user = `${formatPassages(passages)}\n\n<question>${trimmed}</question>`;
    const first = await generate({ system, user, schema: AnswerDraft });
    model = first.model;
    answer = validateAnswer(first.output, passages);

    if (answer.rejected.length) {
      const retryUser = `${user}\n\n<previous_answer>${JSON.stringify(first.output)}</previous_answer>\n\n${rejectionFeedback(answer.rejected)}`;
      const second = await generate({ system, user: retryUser, schema: AnswerDraft });
      model = second.model;
      answer = validateAnswer(second.output, passages);
    }
  }

  const passageIds = Array.from(
    new Set([...answer.summary, ...answer.details].flatMap((c) => c.citations.map((r) => r.passageId))),
  );
  const { rows } = await db.query<{ id: number; created_at: unknown }>(
    `INSERT INTO ask_log (question, answer, passage_ids, prompt_version, model, asked_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
    [trimmed, JSON.stringify(answer), passageIds, PROMPTS.askLibrary, model, opts.askedBy ?? null],
  );
  return {
    id: rows[0].id,
    question: trimmed,
    answer,
    promptVersion: PROMPTS.askLibrary,
    model,
    askedBy: opts.askedBy ?? null,
    createdAt: new Date(rows[0].created_at as string).toISOString(),
  };
}

export async function getAsk(db: Db, id: number): Promise<AskRecord | null> {
  const { rows } = await db.query<Record<string, unknown>>(`SELECT * FROM ask_log WHERE id = $1`, [id]);
  const r = rows[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    question: String(r.question),
    answer: (typeof r.answer === "string" ? JSON.parse(r.answer) : r.answer) as ValidatedAnswer,
    promptVersion: String(r.prompt_version),
    model: (r.model as string) ?? null,
    askedBy: (r.asked_by as string) ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export async function recentAsks(db: Db, limit = 20): Promise<Pick<AskRecord, "id" | "question" | "askedBy" | "createdAt">[]> {
  const { rows } = await db.query<Record<string, unknown>>(
    `SELECT id, question, asked_by, created_at FROM ask_log ORDER BY id DESC LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    question: String(r.question),
    askedBy: (r.asked_by as string) ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
  }));
}
