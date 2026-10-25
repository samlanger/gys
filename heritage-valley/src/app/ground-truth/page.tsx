import Link from "next/link";
import { recentAsks } from "@/lib/ask";
import { getDb } from "@/lib/db";
import { listDocuments } from "@/lib/library";
import { listPolicyRules } from "@/lib/policy";

export const dynamic = "force-dynamic";

export default async function GroundTruth() {
  const db = await getDb();
  const [docs, rules, asks] = await Promise.all([listDocuments(db), listPolicyRules(db), recentAsks(db, 8)]);
  const tiles = [
    { href: "/ground-truth/ask", name: "Ask the library", line: "Plain-language questions, answered with page-level citations." },
    { href: "/ground-truth/library", name: "Library", line: `${docs.length} document${docs.length === 1 ? "" : "s"} with owner, date, and last-verified tags.` },
    { href: "/ground-truth/policy", name: "Policy register", line: `${rules.length} rule${rules.length === 1 ? "" : "s"}: who can change each one, how, and how hard.` },
    { href: "/ground-truth/cases", name: "Case studies", line: "How other towns reinvented themselves, tagged by move type." },
  ];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-valley-900">Ground Truth Room</h1>
        <p className="mt-1 text-stone-600">The facts and the rules. Every answer comes from the library, with a source for every claim.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm hover:border-valley-600">
            <h2 className="font-serif text-lg font-semibold text-valley-900">{t.name}</h2>
            <p className="text-sm text-stone-600">{t.line}</p>
          </Link>
        ))}
      </div>
      {asks.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Recent questions (audit trail)</h2>
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white text-sm">
            {asks.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 px-4 py-2">
                <Link href={`/brief/${a.id}`} className="text-valley-700 hover:underline">
                  {a.question}
                </Link>
                <span className="text-stone-500">
                  {a.askedBy ?? "unknown"} · {new Date(a.createdAt).toLocaleDateString("en-US")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
