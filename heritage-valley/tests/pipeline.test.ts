import fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db";
import { askLibrary, getAsk } from "@/lib/ask";
import type { StructuredGenerator } from "@/lib/claude";
import { ingestPdf } from "@/lib/ingest";
import { extractPolicyRules, listPolicyRules } from "@/lib/policy";
import { searchPassages } from "@/lib/search";
import { makePdf, testDb, useTempStorage } from "./helpers";

let db: Db;
let documentId: number;

beforeAll(async () => {
  await useTempStorage();
  db = await testDb();
  const pdf = await makePdf([
    ["Fillmore Visitor Study", "Prepared for the tourism board."],
    ["Overnight stays averaged 1.4 nights per visitor in 2024.", "Most visitors were day trippers from Los Angeles."],
    ["Farm stays in agricultural zones require a conditional use permit."],
  ]);
  const result = await ingestPdf(db, pdf, {
    title: "Fillmore Visitor Study",
    category: "tourism_economics",
    docType: "study",
    geography: ["Fillmore"],
    topics: ["lodging"],
    publishedDate: "2024-06-01",
    owner: "Tourism board",
  });
  documentId = result.documentId;
});

const mockGenerator = (...outputs: unknown[]) => {
  const fn = vi.fn();
  outputs.forEach((o) => fn.mockResolvedValueOnce({ output: o, model: "test-model" }));
  return fn as unknown as StructuredGenerator & ReturnType<typeof vi.fn>;
};

describe("ingestion", () => {
  it("keeps page numbers on every passage", async () => {
    const hits = await searchPassages(db, "overnight stays nights");
    expect(hits[0]).toMatchObject({ documentId, pageNumber: 2, documentTitle: "Fillmore Visitor Study" });
  });

  it("does not ingest the same file twice", async () => {
    const { rows } = await db.query<{ file_path: string }>(`SELECT file_path FROM documents WHERE id = $1`, [documentId]);
    const original = await fs.readFile(path.join(process.env.FILE_STORAGE_DIR!, rows[0].file_path));
    const again = await ingestPdf(db, original, {
      title: "dup",
      category: "tourism_economics",
      docType: "study",
      geography: [],
      topics: [],
      publishedDate: null,
      owner: "x",
    });
    expect(again).toMatchObject({ duplicate: true, documentId });
  });
});

describe("askLibrary", () => {
  it("answers with page-level citations and logs the answer", async () => {
    const generate = mockGenerator({
      found: true,
      summary: [
        {
          text: "Visitors stayed 1.4 nights on average in 2024.",
          confidence: "direct",
          citations: [{ passage_id: "P1", quote: "Overnight stays averaged 1.4 nights per visitor in 2024." }],
        },
      ],
      details: [],
      not_covered: [],
    });
    const record = await askLibrary(db, "How long do overnight visitors stay?", { generate, askedBy: "aide@example.org" });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(record.answer.status).toBe("answered");
    expect(record.answer.summary[0].citations[0]).toMatchObject({ documentId, pageNumber: 2 });

    const logged = await getAsk(db, record.id);
    expect(logged).toMatchObject({ question: "How long do overnight visitors stay?", askedBy: "aide@example.org" });
    expect(logged!.answer.summary[0].text).toBe("Visitors stayed 1.4 nights on average in 2024.");
  });

  it("asks the model to fix failing claims once, then drops what still fails", async () => {
    const bad = {
      found: true,
      summary: [
        { text: "Visitors stayed 3 nights.", confidence: "direct", citations: [{ passage_id: "P1", quote: "3 nights" }] },
      ],
      details: [],
      not_covered: [],
    };
    const fixed = {
      found: true,
      summary: [
        {
          text: "Visitors stayed 1.4 nights.",
          confidence: "direct",
          citations: [{ passage_id: "P1", quote: "averaged 1.4 nights" }],
        },
      ],
      details: [{ text: "Most came from Paris.", confidence: "direct", citations: [{ passage_id: "P1", quote: "from Paris" }] }],
      not_covered: [],
    };
    const generate = mockGenerator(bad, fixed);
    const record = await askLibrary(db, "How many nights do overnight visitors stay?", { generate });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1][0].user).toContain("failed citation checks");
    expect(record.answer.summary.map((c) => c.text)).toEqual(["Visitors stayed 1.4 nights."]);
    expect(record.answer.rejected.map((r) => r.text)).toEqual(["Most came from Paris."]);
  });

  it("says not found without calling the model when nothing matches", async () => {
    const generate = mockGenerator();
    const record = await askLibrary(db, "zxqv blorf", { generate });
    expect(generate).not.toHaveBeenCalled();
    expect(record.answer.status).toBe("not_found");
  });
});

describe("extractPolicyRules", () => {
  it("stores rules with verified quotes as preliminary and rejects the rest", async () => {
    const generate = mockGenerator({
      rules: [
        {
          rule: "Farm stays in agricultural zones need a conditional use permit.",
          passage_id: "P1",
          quote: "Farm stays in agricultural zones require a conditional use permit.",
          section: "",
          who_can_change: "city_council",
          change_path: "ordinance_amendment",
          difficulty: "medium",
          difficulty_rationale: "Requires a code amendment and public hearings.",
        },
        {
          rule: "Invented rule.",
          passage_id: "P1",
          quote: "No farm stays are allowed anywhere.",
          section: "",
          who_can_change: "state",
          change_path: "state_legislation",
          difficulty: "high",
          difficulty_rationale: "n/a",
        },
      ],
    });
    const result = await extractPolicyRules(db, documentId, "farm stays permit", { generate });
    expect(result.inserted).toBe(1);
    expect(result.rejected).toHaveLength(1);
    const rules = await listPolicyRules(db, "farm stays permit");
    expect(rules[0]).toMatchObject({ pageNumber: 3, reviewStatus: "preliminary", whoCanChange: "city_council" });
  });
});
