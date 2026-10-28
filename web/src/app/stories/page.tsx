import Link from "next/link";
import { load } from "@/lib/session-data";
import { userName } from "@/lib/views";
import { SampleTag } from "@/components/ActionCard";
import { Doodle } from "@/components/Doodle";
import { LocalTime } from "@/components/LocalTime";

export const metadata = { title: "Stories" };

export default async function Stories() {
  const { db } = await load();
  const stories = db.stories.filter((s) => s.visibility === "public").sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold">What actually happened</h1>
        <p className="mt-1 text-muted">Honest stories from Circles. Every one is shared only after everyone who took part said yes.</p>
      </header>
      {stories.length === 0 && <p className="card p-5">No public stories yet. They&apos;ll appear here once groups choose to share them.</p>}
      {stories.map((s) => {
        const a = db.actions.find((x) => x.id === s.actionId);
        const c = db.circles.find((x) => x.id === s.circleId);
        return (
          <article key={s.id} className="card space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Doodle category={a?.category ?? "making"} className="h-12 w-12" />
              <div className="flex-1">
                <p className="font-display font-bold">
                  {c?.emoji} {c?.name}
                </p>
                <p className="text-xs text-muted">
                  {a?.title} · {a && <LocalTime iso={a.startsAt} mode="short" />}
                </p>
              </div>
              {s.isSample && <SampleTag />}
            </div>
            <p className="text-lg">{s.whatHappened}</p>
            {s.learned && (
              <p className="rounded-2xl bg-sun/30 p-3 text-sm">
                <b>What we learned:</b> {s.learned}
              </p>
            )}
            <p className="text-sm text-muted">— {userName(db, s.authorId)}</p>
            {a?.allowAdaptation && a.visibility === "public" && (
              <Link href={`/adapt/${a.slug}`} className="btn-mint btn-sm">
                🌱 Try this with your people
              </Link>
            )}
          </article>
        );
      })}
    </div>
  );
}
