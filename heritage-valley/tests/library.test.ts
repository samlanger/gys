import { describe, expect, it } from "vitest";
import { chunkPage, validateMeta } from "@/lib/ingest";
import { isDated } from "@/lib/library";
import { toOrQuery } from "@/lib/search";

describe("isDated", () => {
  const now = new Date("2026-10-25T00:00:00Z");
  it("flags documents published more than five years ago", () => {
    expect(isDated({ published_date: "2021-10-24", last_verified: "2026-10-01" }, now)).toBe(true);
    expect(isDated({ published_date: "2021-10-26", last_verified: "2026-10-01" }, now)).toBe(false);
  });
  it("falls back to last verified when the publication date is unknown", () => {
    expect(isDated({ published_date: null, last_verified: "2019-01-01" }, now)).toBe(true);
  });
});

describe("chunkPage", () => {
  it("keeps short pages whole and normalizes whitespace", () => {
    expect(chunkPage("Hello   world.\nSecond line.")).toEqual(["Hello world. Second line."]);
  });
  it("splits long pages into passages under the limit", () => {
    const text = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const chunks = chunkPage(text, 200);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 200)).toBe(true);
    expect(chunks.join(" ")).toBe(text);
  });
});

describe("validateMeta", () => {
  it("requires a title, owner, and ISO dates", () => {
    const errors = validateMeta({
      title: "",
      owner: "",
      category: "plans_law",
      docType: "plan",
      geography: [],
      topics: [],
      publishedDate: "May 2020",
    });
    expect(errors).toHaveLength(3);
  });
});

describe("toOrQuery", () => {
  it("builds an OR query from the words of a question", () => {
    expect(toOrQuery("What's the TOT rate in Fillmore?")).toBe("whats | the | tot | rate | in | fillmore");
    expect(toOrQuery("?!")).toBeNull();
  });
});
