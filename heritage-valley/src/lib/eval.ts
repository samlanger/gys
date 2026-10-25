import type { ValidatedAnswer } from "./citations";

export interface EvalQuestion {
  id: string;
  question: string;
  /** Set for questions the library cannot answer; the tool must say "not found". */
  expectNotFound?: boolean;
  /** At least one citation must point at one of these document pages. */
  expectedSources?: { documentTitle: string; pages: number[] }[];
  /** Phrases (case-insensitive) the answer text must contain, e.g. a key figure. */
  mustInclude?: string[];
}

/** Returns the reasons a question failed; empty means it passed. */
export function gradeAnswer(q: EvalQuestion, answer: ValidatedAnswer): string[] {
  const failures: string[] = [];
  const claims = [...answer.summary, ...answer.details];

  if (q.expectNotFound) {
    if (answer.status !== "not_found") failures.push("expected “not found in the sources” but got an answer");
    return failures;
  }
  if (answer.status !== "answered") return ["expected an answer but got “not found”"];

  if (q.expectedSources?.length) {
    const cited = claims.flatMap((c) => c.citations);
    const hit = cited.some((c) =>
      q.expectedSources!.some((s) => s.documentTitle === c.documentTitle && s.pages.includes(c.pageNumber)),
    );
    if (!hit) {
      const got = Array.from(new Set(cited.map((c) => `${c.documentTitle} p.${c.pageNumber}`))).join("; ");
      failures.push(`no citation to an expected page (cited: ${got || "nothing"})`);
    }
  }

  const text = claims.map((c) => c.text).join(" ").toLowerCase();
  for (const phrase of q.mustInclude ?? []) {
    if (!text.includes(phrase.toLowerCase())) failures.push(`answer does not mention “${phrase}”`);
  }
  return failures;
}
