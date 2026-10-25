import { z } from "zod";
import type { Passage } from "./search";

/**
 * Validation of model answers against the passages they were given. This is
 * the "no citation, no claim" rule from SPEC.md, enforced in code: a claim
 * survives only if every citation points at a retrieved passage, every quote
 * appears verbatim in that passage, and every number in the claim appears in a
 * cited passage.
 */

export const CONFIDENCE_LABELS = {
  direct: "Directly stated in a source",
  synthesized: "Synthesized across sources",
  suggestion: "Tool's suggestion",
} as const;
export type Confidence = keyof typeof CONFIDENCE_LABELS;

export const NOT_FOUND_MESSAGE = "Not found in the sources.";
export const MAX_QUOTE_CHARS = 300;
export const MAX_SUMMARY_SENTENCES = 3;

// Shape the model must return (structured output). Passage ids are the
// short labels ("P1", "P2", ...) used in the prompt, not database ids.
export const DraftCitation = z.object({
  passage_id: z.string(),
  quote: z.string(),
});
export const DraftClaim = z.object({
  text: z.string(),
  confidence: z.enum(["direct", "synthesized", "suggestion"]),
  citations: z.array(DraftCitation),
});
export const AnswerDraft = z.object({
  found: z.boolean(),
  summary: z.array(DraftClaim),
  details: z.array(DraftClaim),
  not_covered: z.array(z.string()),
});
export type DraftClaim = z.infer<typeof DraftClaim>;
export type AnswerDraft = z.infer<typeof AnswerDraft>;

export interface ResolvedCitation {
  label: string;
  passageId: number;
  documentId: number;
  documentTitle: string;
  pageNumber: number;
  quote: string;
  dated: boolean;
  copyrighted: boolean;
}

export interface ValidatedClaim {
  text: string;
  confidence: Confidence;
  citations: ResolvedCitation[];
}

export interface RejectedClaim {
  text: string;
  reasons: string[];
}

export interface ValidatedAnswer {
  status: "answered" | "not_found";
  summary: ValidatedClaim[];
  details: ValidatedClaim[];
  notCovered: string[];
  rejected: RejectedClaim[];
}

export function passageLabel(index: number): string {
  return `P${index + 1}`;
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Numbers as they would be compared: "1,250" and "1250" are the same number. */
export function extractNumbers(s: string): string[] {
  return (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
    .map((n) => n.replace(/,/g, "").replace(/\.$/, ""))
    .filter(Boolean);
}

export function validateClaim(
  claim: DraftClaim,
  passagesByLabel: Map<string, Passage>,
): { claim: ValidatedClaim | null; reasons: string[] } {
  const reasons: string[] = [];
  const resolved: ResolvedCitation[] = [];

  for (const c of claim.citations) {
    const passage = passagesByLabel.get(c.passage_id.trim().toUpperCase());
    if (!passage) {
      reasons.push(`cites ${c.passage_id}, which was not among the retrieved passages`);
      continue;
    }
    const quote = c.quote.trim();
    if (!quote) {
      reasons.push(`citation ${c.passage_id} has no supporting quote`);
      continue;
    }
    if (quote.length > MAX_QUOTE_CHARS) {
      reasons.push(`quote from ${c.passage_id} is longer than ${MAX_QUOTE_CHARS} characters`);
      continue;
    }
    if (!normalizeText(passage.text).includes(normalizeText(quote))) {
      reasons.push(`quote attributed to ${c.passage_id} does not appear in that passage`);
      continue;
    }
    resolved.push({
      label: c.passage_id.trim().toUpperCase(),
      passageId: passage.id,
      documentId: passage.documentId,
      documentTitle: passage.documentTitle,
      pageNumber: passage.pageNumber,
      quote,
      dated: passage.dated,
      copyrighted: passage.copyrighted,
    });
  }

  if (claim.confidence === "direct" && resolved.length < 1) {
    reasons.push("a directly-stated claim needs at least one valid citation");
  }
  if (claim.confidence === "synthesized" && resolved.length < 2) {
    reasons.push("a synthesized claim needs at least two valid citations");
  }

  // No uncited numbers: every number in the claim must appear in a cited passage.
  const citedNumbers = new Set(
    resolved.flatMap((r) => extractNumbers(passagesByLabel.get(r.label)!.text)),
  );
  const missing = extractNumbers(claim.text).filter((n) => !citedNumbers.has(n));
  if (missing.length) {
    reasons.push(`contains numbers not found in its cited passages: ${missing.join(", ")}`);
  }

  if (reasons.length) return { claim: null, reasons };
  return { claim: { text: claim.text.trim(), confidence: claim.confidence, citations: resolved }, reasons };
}

export function validateAnswer(draft: AnswerDraft, passages: Passage[]): ValidatedAnswer {
  const byLabel = new Map(passages.map((p, i) => [passageLabel(i), p]));
  const rejected: RejectedClaim[] = [];

  const check = (claims: DraftClaim[]) =>
    claims.flatMap((c) => {
      const { claim, reasons } = validateClaim(c, byLabel);
      if (!claim) rejected.push({ text: c.text, reasons });
      return claim ? [claim] : [];
    });

  let summary = check(draft.summary);
  let details = check(draft.details);
  // Plain language first: at most three summary sentences, extras move to detail.
  if (summary.length > MAX_SUMMARY_SENTENCES) {
    details = [...summary.slice(MAX_SUMMARY_SENTENCES), ...details];
    summary = summary.slice(0, MAX_SUMMARY_SENTENCES);
  }
  // If only detail claims survived, lift the first one so the answer still leads with a summary.
  if (!summary.length && details.length) summary = [details.shift()!];

  const hasSourcedClaim = [...summary, ...details].some((c) => c.citations.length > 0);
  const status = draft.found && hasSourcedClaim ? "answered" : "not_found";
  return {
    status,
    summary: status === "answered" ? summary : [],
    details: status === "answered" ? details : [],
    notCovered: draft.not_covered.map((s) => s.trim()).filter(Boolean),
    rejected,
  };
}

/** Feedback for the model when its first answer had claims rejected. */
export function rejectionFeedback(rejected: RejectedClaim[]): string {
  const lines = rejected.map((r) => `- "${r.text}": ${r.reasons.join("; ")}`);
  return [
    "Some claims in your answer failed citation checks and will be removed:",
    ...lines,
    "",
    "Return the full answer again. Fix each failing claim by quoting the passage exactly, citing the passage that actually contains it, or removing it. Do not add claims the passages do not support.",
  ].join("\n");
}
