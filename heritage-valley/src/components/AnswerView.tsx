import type { AskRecord } from "@/lib/ask";
import { CONFIDENCE_LABELS, NOT_FOUND_MESSAGE, type ResolvedCitation, type ValidatedClaim } from "@/lib/citations";
import { pageLink } from "@/lib/library";

interface Source {
  n: number;
  documentId: number;
  documentTitle: string;
  pageNumber: number;
  quotes: string[];
  dated: boolean;
  copyrighted: boolean;
}

/** Numbers sources by first appearance, one entry per document page. */
function collectSources(claims: ValidatedClaim[]): { sources: Source[]; numberOf: (c: ResolvedCitation) => number } {
  const byKey = new Map<string, Source>();
  for (const claim of claims) {
    for (const c of claim.citations) {
      const key = `${c.documentId}:${c.pageNumber}`;
      let s = byKey.get(key);
      if (!s) {
        s = { n: byKey.size + 1, ...c, quotes: [] };
        byKey.set(key, s);
      }
      if (!s.quotes.includes(c.quote)) s.quotes.push(c.quote);
    }
  }
  return {
    sources: [...byKey.values()],
    numberOf: (c) => byKey.get(`${c.documentId}:${c.pageNumber}`)!.n,
  };
}

function Confidence({ value }: { value: ValidatedClaim["confidence"] }) {
  const styles = {
    direct: "bg-valley-100 text-valley-700",
    synthesized: "bg-sky-100 text-sky-800",
    suggestion: "bg-citrus-100 text-citrus-700",
  };
  return (
    <span className={`ml-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ${styles[value]}`}>
      {CONFIDENCE_LABELS[value]}
    </span>
  );
}

function Claim({ claim, numberOf, showConfidence }: { claim: ValidatedClaim; numberOf: (c: ResolvedCitation) => number; showConfidence: boolean }) {
  const refs = Array.from(new Set(claim.citations.map(numberOf))).sort((a, b) => a - b);
  return (
    <>
      {claim.text}
      {refs.map((n) => (
        <a key={n} href={`#source-${n}`} className="ml-0.5 align-super text-xs text-valley-700 hover:underline">
          [{n}]
        </a>
      ))}
      {(showConfidence || claim.confidence !== "direct") && <Confidence value={claim.confidence} />}
    </>
  );
}

export function AnswerView({ record }: { record: AskRecord }) {
  const { answer } = record;
  const { sources, numberOf } = collectSources([...answer.summary, ...answer.details]);

  return (
    <div className="space-y-6">
      {answer.status === "not_found" ? (
        <div className="rounded-lg border border-stone-300 bg-white p-5">
          <p className="font-semibold">{NOT_FOUND_MESSAGE}</p>
          <p className="mt-1 text-sm text-stone-600">
            The library has no passage that supports an answer, so the tool is not guessing.
          </p>
        </div>
      ) : (
        <section className="rounded-lg border border-valley-100 bg-valley-50 p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-valley-700">Summary</h3>
          <p className="text-lg leading-relaxed">
            {answer.summary.map((c, i) => (
              <span key={i}>
                <Claim claim={c} numberOf={numberOf} showConfidence={false} />{" "}
              </span>
            ))}
          </p>
        </section>
      )}

      {answer.details.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Detail</h3>
          <ul className="space-y-2">
            {answer.details.map((c, i) => (
              <li key={i} className="leading-relaxed">
                <Claim claim={c} numberOf={numberOf} showConfidence />
              </li>
            ))}
          </ul>
        </section>
      )}

      {answer.notCovered.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Not found in the sources</h3>
          <ul className="list-disc space-y-1 pl-5 text-stone-700">
            {answer.notCovered.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {sources.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Sources</h3>
          <ol className="space-y-3">
            {sources.map((s) => (
              <li key={s.n} id={`source-${s.n}`} className="rounded border border-stone-200 bg-white p-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold">[{s.n}]</span>
                  {s.copyrighted ? (
                    <span>
                      {s.documentTitle}, p. {s.pageNumber}
                    </span>
                  ) : (
                    <a href={pageLink(s.documentId, s.pageNumber)} target="_blank" className="text-valley-700 underline">
                      {s.documentTitle}, p. {s.pageNumber}
                    </a>
                  )}
                  {s.dated && (
                    <span className="rounded bg-citrus-100 px-1.5 text-[11px] text-citrus-700">Dated: over 5 years old</span>
                  )}
                  {s.copyrighted && <span className="text-[11px] text-stone-500">Copyrighted: cited, not displayed</span>}
                </div>
                {s.quotes.map((q, i) => (
                  <blockquote key={i} className="mt-1 border-l-2 border-stone-300 pl-2 text-stone-600">
                    “{q}”
                  </blockquote>
                ))}
              </li>
            ))}
          </ol>
        </section>
      )}

      {answer.rejected.length > 0 && (
        <details className="no-print text-sm text-stone-500">
          <summary className="cursor-pointer">
            {answer.rejected.length} statement{answer.rejected.length === 1 ? " was" : "s were"} removed because{" "}
            {answer.rejected.length === 1 ? "it" : "they"} failed citation checks
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {answer.rejected.map((r, i) => (
              <li key={i}>
                <span className="line-through">{r.text}</span> — {r.reasons.join("; ")}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
