import { z } from "zod";
import type { Db } from "./db";
import { MAX_QUOTE_CHARS, passageLabel } from "./citations";
import { generateStructured, type StructuredGenerator } from "./claude";
import { formatPassages } from "./ask";
import { loadPrompt, PROMPTS } from "./prompts";
import { searchPassages } from "./search";

export const WHO_CAN_CHANGE = {
  city_council: "City council",
  board_of_supervisors: "Board of Supervisors",
  voters: "Voters",
  state: "State",
  agency_staff: "Agency staff (administrative)",
  unclear: "Unclear",
} as const;

export const CHANGE_PATHS = {
  administrative: "Administrative",
  ordinance_amendment: "Ordinance amendment",
  general_plan_amendment: "General Plan amendment",
  ballot_measure: "Ballot measure",
  state_legislation: "State legislation",
  unclear: "Unclear",
} as const;

export const DIFFICULTIES = ["low", "medium", "high"] as const;

export const COUNSEL_LABEL = "Preliminary, for review by county or city counsel.";

const enumKeys = <T extends Record<string, string>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

export const RuleDraft = z.object({
  rule: z.string(),
  passage_id: z.string(),
  quote: z.string(),
  section: z.string(),
  who_can_change: z.enum(enumKeys(WHO_CAN_CHANGE)),
  change_path: z.enum(enumKeys(CHANGE_PATHS)),
  difficulty: z.enum(DIFFICULTIES),
  difficulty_rationale: z.string(),
});
export const RuleExtraction = z.object({ rules: z.array(RuleDraft) });
export type RuleDraft = z.infer<typeof RuleDraft>;

export interface PolicyRule {
  id: number;
  topic: string;
  rule: string;
  documentId: number;
  documentTitle: string;
  section: string | null;
  pageNumber: number;
  quote: string;
  whoCanChange: keyof typeof WHO_CAN_CHANGE;
  changePath: keyof typeof CHANGE_PATHS;
  difficulty: (typeof DIFFICULTIES)[number];
  difficultyRationale: string;
  blocksVisions: string | null;
  reviewStatus: "preliminary" | "reviewed_by_counsel";
  reviewedBy: string | null;
  createdAt: string;
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Extracts rules on `topic` from one document into the register. Rules whose
 * quote cannot be found in the cited passage are rejected, not stored.
 */
export async function extractPolicyRules(
  db: Db,
  documentId: number,
  topic: string,
  opts: { createdBy?: string | null; generate?: StructuredGenerator } = {},
): Promise<{ inserted: number; rejected: { rule: string; reason: string }[] }> {
  const generate = opts.generate ?? generateStructured;
  const passages = await searchPassages(db, topic, { documentId, limit: 25 });
  if (!passages.length) return { inserted: 0, rejected: [] };

  const { output } = await generate({
    system: loadPrompt(PROMPTS.policyExtract),
    user: `${formatPassages(passages)}\n\n<topic>${topic.trim()}</topic>`,
    schema: RuleExtraction,
    effort: "high",
  });

  const byLabel = new Map(passages.map((p, i) => [passageLabel(i), p]));
  const rejected: { rule: string; reason: string }[] = [];
  let inserted = 0;
  for (const r of output.rules) {
    const passage = byLabel.get(r.passage_id.trim().toUpperCase());
    const quote = r.quote.trim();
    if (!passage) {
      rejected.push({ rule: r.rule, reason: `cites unknown passage ${r.passage_id}` });
    } else if (!quote || quote.length > MAX_QUOTE_CHARS || !normalize(passage.text).includes(normalize(quote))) {
      rejected.push({ rule: r.rule, reason: "quote does not appear in the cited passage" });
    } else {
      await db.query(
        `INSERT INTO policy_rules (topic, rule, document_id, passage_id, section, page_number, quote,
            who_can_change, change_path, difficulty, difficulty_rationale, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          topic.trim(),
          r.rule.trim(),
          documentId,
          passage.id,
          r.section.trim() || null,
          passage.pageNumber,
          quote,
          r.who_can_change,
          r.change_path,
          r.difficulty,
          r.difficulty_rationale.trim(),
          opts.createdBy ?? null,
        ],
      );
      inserted++;
    }
  }
  return { inserted, rejected };
}

export async function listPolicyRules(db: Db, topic?: string): Promise<PolicyRule[]> {
  const { rows } = await db.query<Record<string, unknown>>(
    `SELECT r.*, d.title AS document_title FROM policy_rules r JOIN documents d ON d.id = r.document_id
      WHERE ($1::text IS NULL OR r.topic = $1)
      ORDER BY r.topic, CASE r.difficulty WHEN 'low' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, r.id`,
    [topic ?? null],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    topic: String(r.topic),
    rule: String(r.rule),
    documentId: Number(r.document_id),
    documentTitle: String(r.document_title),
    section: (r.section as string) ?? null,
    pageNumber: Number(r.page_number),
    quote: String(r.quote),
    whoCanChange: r.who_can_change as PolicyRule["whoCanChange"],
    changePath: r.change_path as PolicyRule["changePath"],
    difficulty: r.difficulty as PolicyRule["difficulty"],
    difficultyRationale: String(r.difficulty_rationale),
    blocksVisions: (r.blocks_visions as string) ?? null,
    reviewStatus: r.review_status as PolicyRule["reviewStatus"],
    reviewedBy: (r.reviewed_by as string) ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
  }));
}

export async function listPolicyTopics(db: Db): Promise<string[]> {
  const { rows } = await db.query<{ topic: string }>(`SELECT DISTINCT topic FROM policy_rules ORDER BY topic`);
  return rows.map((r) => r.topic);
}

/** Records that a named counsel reviewed the entry (human sign-off). */
export async function markReviewed(db: Db, id: number, reviewer: string): Promise<void> {
  await db.query(
    `UPDATE policy_rules SET review_status = 'reviewed_by_counsel', reviewed_by = $2 WHERE id = $1`,
    [id, reviewer],
  );
}
