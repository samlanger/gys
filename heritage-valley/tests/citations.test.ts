import { describe, expect, it } from "vitest";
import { extractNumbers, validateAnswer, type AnswerDraft, type DraftClaim } from "@/lib/citations";
import type { Passage } from "@/lib/search";

const passage = (id: number, text: string, extra: Partial<Passage> = {}): Passage => ({
  id,
  documentId: 100 + id,
  documentTitle: `Doc ${id}`,
  pageNumber: id * 2,
  text,
  publishedDate: "2023-01-01",
  dated: false,
  copyrighted: false,
  rank: 1,
  ...extra,
});

const passages = [
  passage(1, "Visitors stayed an average of 1.8 nights in 2022, up from 1.5 nights."),
  passage(2, "The county counted 1,250 hotel rooms across the Heritage Valley."),
  passage(3, "Agritourism uses require a conditional use permit in the AE zone."),
];

const draft = (summary: DraftClaim[], details: DraftClaim[] = [], found = true): AnswerDraft => ({
  found,
  summary,
  details,
  not_covered: [],
});

describe("validateAnswer", () => {
  it("keeps a direct claim whose quote appears in the cited passage", () => {
    const result = validateAnswer(
      draft([
        {
          text: "Visitors stayed 1.8 nights on average in 2022.",
          confidence: "direct",
          citations: [{ passage_id: "P1", quote: "an average of 1.8 nights in 2022" }],
        },
      ]),
      passages,
    );
    expect(result.status).toBe("answered");
    expect(result.rejected).toEqual([]);
    expect(result.summary[0].citations[0]).toMatchObject({ documentId: 101, pageNumber: 2, label: "P1" });
  });

  it("rejects a quote that is not in the passage", () => {
    const result = validateAnswer(
      draft([
        {
          text: "Visitors stayed longer.",
          confidence: "direct",
          citations: [{ passage_id: "P1", quote: "visitors stayed much longer than before" }],
        },
      ]),
      passages,
    );
    expect(result.status).toBe("not_found");
    expect(result.rejected[0].reasons.join()).toMatch(/does not appear/);
  });

  it("rejects citations to passages that were not retrieved", () => {
    const result = validateAnswer(
      draft([{ text: "Rooms exist.", confidence: "direct", citations: [{ passage_id: "P9", quote: "rooms" }] }]),
      passages,
    );
    expect(result.rejected[0].reasons.join()).toMatch(/P9/);
  });

  it("rejects numbers that do not appear in the cited passages", () => {
    const result = validateAnswer(
      draft([
        {
          text: "There are 2,000 hotel rooms.",
          confidence: "direct",
          citations: [{ passage_id: "P2", quote: "hotel rooms across the Heritage Valley" }],
        },
      ]),
      passages,
    );
    expect(result.rejected[0].reasons.join()).toMatch(/2000/);
  });

  it("accepts numbers formatted differently from the source", () => {
    const result = validateAnswer(
      draft([
        {
          text: "The county counted 1250 hotel rooms.",
          confidence: "direct",
          citations: [{ passage_id: "P2", quote: "The county counted 1,250 hotel rooms" }],
        },
      ]),
      passages,
    );
    expect(result.rejected).toEqual([]);
  });

  it("requires two citations for a synthesized claim", () => {
    const one = validateAnswer(
      draft([
        {
          text: "Stays are getting longer.",
          confidence: "synthesized",
          citations: [{ passage_id: "P1", quote: "up from 1.5 nights" }],
        },
      ]),
      passages,
    );
    expect(one.rejected[0].reasons.join()).toMatch(/two valid citations/);
  });

  it("allows uncited suggestions only when they contain no numbers", () => {
    const result = validateAnswer(
      draft(
        [
          {
            text: "Hotel rooms number 1,250.",
            confidence: "direct",
            citations: [{ passage_id: "P2", quote: "1,250 hotel rooms" }],
          },
        ],
        [
          { text: "It may help to ask the county for newer counts.", confidence: "suggestion", citations: [] },
          { text: "Aim for 3 nights.", confidence: "suggestion", citations: [] },
        ],
      ),
      passages,
    );
    expect(result.details.map((c) => c.text)).toEqual(["It may help to ask the county for newer counts."]);
    expect(result.rejected.map((r) => r.text)).toEqual(["Aim for 3 nights."]);
  });

  it("is not found when only uncited suggestions survive", () => {
    const result = validateAnswer(
      draft([{ text: "Consider asking the board.", confidence: "suggestion", citations: [] }]),
      passages,
    );
    expect(result.status).toBe("not_found");
  });

  it("caps the summary at three sentences and moves extras to detail", () => {
    const claim = (q: string): DraftClaim => ({
      text: "Claim.",
      confidence: "direct",
      citations: [{ passage_id: "P3", quote: q }],
    });
    const result = validateAnswer(
      draft([claim("Agritourism uses"), claim("conditional use permit"), claim("in the AE zone"), claim("require a")]),
      passages,
    );
    expect(result.summary).toHaveLength(3);
    expect(result.details).toHaveLength(1);
  });

  it("respects found=false from the model", () => {
    const result = validateAnswer({ ...draft([], [], false), not_covered: ["Lodging tax data"] }, passages);
    expect(result).toMatchObject({ status: "not_found", notCovered: ["Lodging tax data"] });
  });
});

describe("extractNumbers", () => {
  it("normalizes separators and trailing periods", () => {
    expect(extractNumbers("In 2022, 1,250 rooms; 1.8 nights. Up 12.")).toEqual(["2022", "1250", "1.8", "12"]);
  });
});
