import Link from "next/link";
import { load } from "@/lib/session-data";
import { actionCardData, userName } from "@/lib/views";
import { ActionCard, SampleTag } from "@/components/ActionCard";
import { Doodle, Blob } from "@/components/Doodle";
import { LocalTime, Countdown } from "@/components/LocalTime";
import { confirmedCount } from "@/lib/domain/join";
import { TAGLINE } from "@/lib/config";

export default async function Home() {
  const { db, user } = await load();
  const now = Date.now();
  const open = db.actions
    .filter((a) => a.status === "published" && a.visibility === "public" && new Date(a.startsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const featured = open.find((a) => a.capacity - confirmedCount(db, a.id) > 0) ?? open[0];
  const stories = db.stories.filter((s) => s.visibility === "public").slice(0, 2);

  const mine = user
    ? db.rsvps
        .filter((r) => r.userId === user.id && r.status !== "cancelled")
        .map((r) => ({ r, a: db.actions.find((a) => a.id === r.actionId)! }))
        .filter(({ a }) => a && a.status === "published" && new Date(a.startsAt).getTime() > now)
        .sort((x, y) => x.a.startsAt.localeCompare(y.a.startsAt))
    : [];
  const hosting = user ? db.actions.filter((a) => a.hostId === user.id && ["draft", "in_review", "published"].includes(a.status)) : [];

  return (
    <div className="space-y-12">
      {user && (mine.length > 0 || hosting.length > 0) && (
        <section aria-labelledby="yours" className="space-y-3">
          <h2 id="yours" className="text-xl font-bold">
            Hi {user.name} 👋 here&apos;s what&apos;s next
          </h2>
          {mine.map(({ r, a }) => (
            <Link key={r.id} href={`/a/${a.slug}`} className="card flex items-center gap-3 bg-sun/40 p-4">
              <span className="text-3xl" aria-hidden>
                {r.status === "confirmed" ? "🎟️" : "⏳"}
              </span>
              <span className="flex-1">
                <b>{a.title}</b>
                <span className="block text-sm text-muted">
                  <LocalTime iso={a.startsAt} /> · <Countdown iso={a.startsAt} />
                  {r.status === "waitlisted" && " · on the waitlist"}
                </span>
              </span>
              <span aria-hidden>→</span>
            </Link>
          ))}
          {hosting.map((a) => (
            <Link key={a.id} href={a.status === "draft" ? `/plan/${a.id}/edit` : `/plan/${a.id}/manage`} className="card flex items-center gap-3 p-4">
              <span className="text-3xl" aria-hidden>
                🧑‍🍳
              </span>
              <span className="flex-1">
                <b>{a.title}</b>
                <span className="block text-sm text-muted">
                  You&apos;re hosting · {a.status === "draft" ? "draft" : a.status === "in_review" ? "in review" : `${confirmedCount(db, a.id)}/${a.capacity} coming`}
                </span>
              </span>
              <span aria-hidden>→</span>
            </Link>
          ))}
        </section>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border-2 border-ink bg-paper px-6 pb-8 pt-10 shadow-sticker-lg">
        <div aria-hidden className="pointer-events-none absolute -right-6 -top-4 animate-float opacity-90">
          <Doodle category="repair" className="h-28 w-28" />
        </div>
        <div aria-hidden className="pointer-events-none absolute -bottom-6 right-24 animate-float opacity-80 [animation-delay:1.5s]">
          <Doodle category="music" className="h-20 w-20" />
        </div>
        <p className="chip mb-4 bg-sun">✨ Let&apos;s actually do it</p>
        <h1 className="max-w-md text-4xl font-bold leading-[1.05] sm:text-5xl">
          Saw it online?
          <br />
          <span className="relative inline-block">
            <span className="relative z-10">Do it together.</span>
            <span aria-hidden className="absolute inset-x-0 bottom-1 -z-0 h-3 -rotate-1 rounded bg-tomato/40" />
          </span>
        </h1>
        <p className="mt-4 max-w-md text-lg">{TAGLINE}</p>
        <p className="mt-2 max-w-md text-muted">
          Turn the repair video, the recipe or the song you saved into a small, real afternoon with people nearby — and then do it again.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {featured && (
            <Link href={`/a/${featured.slug}`} className="btn-primary">
              Join this →
            </Link>
          )}
          <Link href="/plan/new" className="btn-ghost">
            Make a plan
          </Link>
        </div>
      </section>

      {/* Real action example */}
      {featured && (
        <section aria-labelledby="example" className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 id="example" className="text-xl font-bold">
              Happening soon
            </h2>
            {featured.isSample && <SampleTag />}
          </div>
          <div className="grid gap-3">
            {open.slice(0, 3).map((a) => (
              <ActionCard key={a.id} a={actionCardData(db, a)} />
            ))}
          </div>
          <p className="text-sm text-muted">
            This pilot runs a handful of small gatherings at a time — no endless feed. Can&apos;t find one near you?{" "}
            <Link className="link" href="/plan/new">
              Start one
            </Link>
            .
          </p>
        </section>
      )}

      {/* Three steps */}
      <section aria-labelledby="how" className="space-y-4">
        <h2 id="how" className="text-xl font-bold">
          How it works
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            { n: 1, t: "Bring an idea", d: "Paste the link that inspired you, or pick a ready-made format.", c: "bg-sky/40", e: "💡" },
            { n: 2, t: "Find your people", d: "Share a clear invite. People join in two taps — no app, no social login.", c: "bg-sun/50", e: "🫶" },
            { n: 3, t: "Make it happen", d: "Share small jobs, meet up, then pick the next date together.", c: "bg-mint/40", e: "🎉" },
          ].map((s) => (
            <li key={s.n} className={`card p-5 ${s.c}`}>
              <div className="flex items-center justify-between">
                <span className="font-display text-4xl font-bold">{s.n}</span>
                <span className="text-3xl" aria-hidden>
                  {s.e}
                </span>
              </div>
              <h3 className="mt-2 text-lg font-bold">{s.t}</h3>
              <p className="text-sm">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="card flex items-center gap-4 bg-lilac/30 p-5">
          <span className="text-4xl" aria-hidden>
            🌱
          </span>
          <p>
            <b>Loved it?</b> Tap <i>“Try this with your people”</i> to take the format to your own street, office or group — with your own host, date and place.
          </p>
        </div>
      </section>

      {/* Stories */}
      {stories.length > 0 && (
        <section aria-labelledby="stories" className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 id="stories" className="text-xl font-bold">
              What happened
            </h2>
            {stories.some((s) => s.isSample) && <SampleTag />}
          </div>
          {stories.map((s) => {
            const a = db.actions.find((x) => x.id === s.actionId);
            return (
              <blockquote key={s.id} className="card relative p-5">
                <span aria-hidden className="absolute -top-4 left-4 font-display text-6xl leading-none text-tomato">
                  “
                </span>
                <p className="text-lg">{s.whatHappened}</p>
                {s.learned && <p className="mt-2 text-sm text-muted">Learned: {s.learned}</p>}
                <footer className="mt-3 text-sm font-semibold">
                  — {userName(db, s.authorId)}, {a?.title} · shared with everyone&apos;s permission
                </footer>
              </blockquote>
            );
          })}
          <Link href="/stories" className="link text-sm">
            More stories →
          </Link>
        </section>
      )}

      {/* Formats */}
      <section aria-labelledby="formats" className="space-y-3">
        <h2 id="formats" className="text-xl font-bold">
          Ready-made formats
        </h2>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {db.templates.map((t) => (
            <Link key={t.id} href={`/plan/new?template=${t.id}`} className="card w-44 shrink-0 snap-start p-4 transition hover:-translate-y-1">
              <Doodle category={t.category} className="h-14 w-14" />
              <p className="mt-2 font-display font-bold leading-tight">{t.title}</p>
              <p className="mt-1 text-xs text-muted">{Math.round(t.durationMins / 30) / 2}h · {t.costLabel}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Vision */}
      <section className="card bg-ink p-6 text-cream" aria-labelledby="vision">
        <Blob className="mb-3 h-12 w-12" />
        <h2 id="vision" className="text-2xl font-bold">
          Why we&apos;re building this
        </h2>
        <p className="mt-2 opacity-90">
          We think people should get to belong, contribute and shape the place they live. It starts small: an afternoon fixing clothes with neighbours. Good afternoons become
          Circles. Circles share what works so others can try it. One day, maybe, a network of local groups that can take on bigger things together — with authority that stays
          local and specific, and never goes to whoever is loudest or richest.
        </p>
        <p className="mt-3 text-sm opacity-70">No ads. No selling your relationships. No popularity scores.</p>
      </section>
    </div>
  );
}
