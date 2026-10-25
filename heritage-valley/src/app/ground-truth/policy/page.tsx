import { ExtractForm, ReviewButton } from "@/components/PolicyForms";
import { currentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listDocuments, pageLink } from "@/lib/library";
import { CHANGE_PATHS, COUNSEL_LABEL, listPolicyRules, WHO_CAN_CHANGE } from "@/lib/policy";
import { canEdit } from "@/lib/session";

export const dynamic = "force-dynamic";

const DIFFICULTY_STYLE = {
  low: "bg-valley-100 text-valley-700",
  medium: "bg-citrus-100 text-citrus-700",
  high: "bg-red-100 text-red-800",
};

export default async function PolicyRegister() {
  const db = await getDb();
  const [rules, docs, session] = await Promise.all([listPolicyRules(db), listDocuments(db), currentSession()]);
  const lawDocs = docs.filter((d) => d.category === "plans_law");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-valley-900">Policy register</h1>
        <p className="mt-1 text-stone-600">
          Rules that bear on the pilot topic: what each says, who can change it, how, and how hard.
        </p>
        <p className="mt-2 inline-block rounded bg-citrus-100 px-2 py-1 text-sm text-citrus-700">
          Every entry is {COUNSEL_LABEL.toLowerCase()} The tool does not state legal conclusions.
        </p>
      </div>

      {rules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-stone-600">
          No rules yet. Add plans and codes to the library, then extract rules for the pilot topic.
        </p>
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <article key={r.id} className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-base font-medium">{r.rule}</p>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${DIFFICULTY_STYLE[r.difficulty]}`}>
                  {r.difficulty[0].toUpperCase() + r.difficulty.slice(1)} difficulty
                </span>
              </div>
              <blockquote className="mt-2 border-l-2 border-stone-300 pl-2 text-stone-600">“{r.quote}”</blockquote>
              <dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                <div>
                  <dt className="inline text-stone-500">Source: </dt>
                  <dd className="inline">
                    <a href={pageLink(r.documentId, r.pageNumber)} target="_blank" className="text-valley-700 underline">
                      {r.documentTitle}
                      {r.section ? `, ${r.section}` : ""}, p. {r.pageNumber}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="inline text-stone-500">Topic: </dt>
                  <dd className="inline">{r.topic}</dd>
                </div>
                <div>
                  <dt className="inline text-stone-500">Who can change it: </dt>
                  <dd className="inline">{WHO_CAN_CHANGE[r.whoCanChange]}</dd>
                </div>
                <div>
                  <dt className="inline text-stone-500">Change path: </dt>
                  <dd className="inline">{CHANGE_PATHS[r.changePath]}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="inline text-stone-500">Why this difficulty: </dt>
                  <dd className="inline">{r.difficultyRationale}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="inline text-stone-500">Blocks which visions: </dt>
                  <dd className="inline">{r.blocksVisions ?? "Linked once the Dream Room's North Star is published."}</dd>
                </div>
              </dl>
              <div className="mt-3 flex items-center gap-3 text-xs text-stone-500">
                {r.reviewStatus === "reviewed_by_counsel" ? (
                  <span className="text-valley-700">Reviewed by counsel: {r.reviewedBy}</span>
                ) : (
                  <span>{COUNSEL_LABEL}</span>
                )}
                {session?.role === "admin" && r.reviewStatus === "preliminary" && <ReviewButton id={r.id} />}
              </div>
            </article>
          ))}
        </div>
      )}

      {canEdit(session) && (
        <section className="space-y-2">
          <h2 className="font-serif text-xl font-semibold">Extract rules from a plan or code</h2>
          {lawDocs.length ? (
            <ExtractForm documents={lawDocs.map((d) => ({ id: d.id, title: d.title }))} />
          ) : (
            <p className="text-sm text-stone-600">Add a document in the “Plans and law” category first.</p>
          )}
        </section>
      )}
    </div>
  );
}
