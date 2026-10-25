import { CASE_STUDIES, evidenceFor } from "@/lib/cases";
import { getDb } from "@/lib/db";
import { listDocuments } from "@/lib/library";

export const dynamic = "force-dynamic";

export default async function CaseStudies() {
  const docs = await getDb().then(listDocuments);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-valley-900">Case studies</h1>
        <p className="mt-1 max-w-2xl text-stone-600">
          How other towns reinvented themselves. A case counts as evidence only once a source in the library backs it;
          until then it is a research question. Cost, timeline, and outcome are filled in from those sources, never from
          memory.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {CASE_STUDIES.map((cs) => {
          const evidence = evidenceFor(cs, docs);
          return (
            <article key={cs.id} className="space-y-2 rounded-lg border border-stone-200 bg-white p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-valley-900">{cs.town}</h2>
                  <p className="text-xs text-stone-500">{cs.region}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${evidence.length ? "bg-valley-100 text-valley-700" : "bg-stone-100 text-stone-500"}`}
                >
                  {evidence.length ? `${evidence.length} source${evidence.length === 1 ? "" : "s"}` : "Needs sources"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {cs.moveTypes.map((m) => (
                  <span key={m} className="rounded bg-stone-100 px-1.5 text-[11px] text-stone-600">
                    {m}
                  </span>
                ))}
              </div>
              <p className="text-stone-700">
                <span className="text-stone-500">Research focus: </span>
                {cs.researchFocus}
              </p>
              {evidence.length > 0 && (
                <ul className="list-disc pl-5">
                  {evidence.map((d) => (
                    <li key={d.id}>
                      {d.copyrighted ? (
                        d.title
                      ) : (
                        <a href={`/api/files/${d.id}`} target="_blank" className="text-valley-700 underline">
                          {d.title}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
      <p className="text-sm text-stone-500">
        To attach a source, add it to the library in the “Case studies” category with the town as its geography. Ask the
        library about a case to get cited findings.
      </p>
    </div>
  );
}
