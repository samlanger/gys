import { UploadForm } from "@/components/UploadForm";
import { currentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { CATEGORIES, isDated, listDocuments } from "@/lib/library";
import { canEdit } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Library() {
  const [docs, session] = await Promise.all([getDb().then(listDocuments), currentSession()]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-valley-900">Library</h1>
        <p className="mt-1 text-stone-600">
          The source of truth. Every document keeps its original file and page numbers, an owner, and a last-verified
          date. Anything more than five years old is flagged as dated.
        </p>
      </div>
      {docs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-stone-600">
          The library is empty. Add the pilot's core documents below, or in bulk with <code>npm run ingest</code>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2">Document</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Published</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Verified</th>
                <th className="px-3 py-2">Pages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {docs.map((d) => (
                <tr key={d.id}>
                  <td className="px-3 py-2">
                    {d.copyrighted ? (
                      d.title
                    ) : (
                      <a href={`/api/files/${d.id}`} target="_blank" className="text-valley-700 underline">
                        {d.title}
                      </a>
                    )}
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {isDated(d) && <span className="rounded bg-citrus-100 px-1.5 text-[11px] text-citrus-700">Dated</span>}
                      {d.copyrighted && <span className="rounded bg-stone-100 px-1.5 text-[11px] text-stone-600">Copyrighted</span>}
                      {d.pages_without_text > 0 && (
                        <span className="rounded bg-red-50 px-1.5 text-[11px] text-red-700">{d.pages_without_text} pages need OCR</span>
                      )}
                      {[...d.geography, ...d.topics].map((t) => (
                        <span key={t} className="rounded bg-stone-100 px-1.5 text-[11px] text-stone-600">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">{CATEGORIES[d.category] ?? d.category}</td>
                  <td className="px-3 py-2">{d.published_date ?? "Unknown"}</td>
                  <td className="px-3 py-2">{d.owner}</td>
                  <td className="px-3 py-2">{d.last_verified}</td>
                  <td className="px-3 py-2">{d.page_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canEdit(session) && (
        <section className="space-y-2">
          <h2 className="font-serif text-xl font-semibold">Add a document</h2>
          <UploadForm />
        </section>
      )}
    </div>
  );
}
