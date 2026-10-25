import { describe, expect, it } from "vitest";
import type { ValidatedAnswer } from "@/lib/citations";
import { gradeAnswer } from "@/lib/eval";

const answer: ValidatedAnswer = {
  status: "answered",
  summary: [
    {
      text: "Visitors stayed 1.4 nights on average.",
      confidence: "direct",
      citations: [
        {
          label: "P1",
          passageId: 1,
          documentId: 1,
          documentTitle: "Visitor Study",
          pageNumber: 12,
          quote: "1.4 nights",
          dated: false,
          copyrighted: false,
        },
      ],
    },
  ],
  details: [],
  notCovered: [],
  rejected: [],
};

describe("gradeAnswer", () => {
  it("passes when the answer cites an expected page and includes the key phrase", () => {
    expect(
      gradeAnswer(
        { id: "a", question: "?", expectedSources: [{ documentTitle: "Visitor Study", pages: [12] }], mustInclude: ["1.4 nights"] },
        answer,
      ),
    ).toEqual([]);
  });

  it("fails when the citation points at the wrong page", () => {
    const failures = gradeAnswer({ id: "a", question: "?", expectedSources: [{ documentTitle: "Visitor Study", pages: [3] }] }, answer);
    expect(failures[0]).toMatch(/Visitor Study p.12/);
  });

  it("checks not-found questions", () => {
    expect(gradeAnswer({ id: "a", question: "?", expectNotFound: true }, answer)).toHaveLength(1);
    expect(gradeAnswer({ id: "a", question: "?", expectNotFound: true }, { ...answer, status: "not_found" })).toEqual([]);
  });
});
