import Link from "next/link";
import { load } from "@/lib/session-data";
import { startPlan } from "@/app/actions";
import { Doodle } from "@/components/Doodle";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Make a plan" };

export default async function NewPlan({ searchParams }: { searchParams: Promise<{ template?: string; circle?: string }> }) {
  const sp = await searchParams;
  const { db, user } = await load();
  const circle = sp.circle ? db.circles.find((c) => c.id === sp.circle) : undefined;
  const ordered = [...db.templates].sort((a, b) => (a.id === sp.template ? -1 : b.id === sp.template ? 1 : 0));

  return (
    <div className="space-y-8">
      <header>
        <p className="chip bg-sun">Step 1 of 3</p>
        <h1 className="mt-3 text-3xl font-bold">What do you want to make happen?</h1>
        <p className="mt-1 text-muted">
          {circle ? `Planning something new for ${circle.emoji} ${circle.name}.` : "Start from a format that's worked before, a link that inspired you, or your own idea."}
        </p>
        {!user && (
          <p className="mt-3 rounded-2xl bg-sky/30 p-3 text-sm">
            You&apos;ll be asked to sign in first — just a name and email. <Link href="/signin?next=/plan/new" className="link">Sign in now</Link>
          </p>
        )}
      </header>

      <section aria-labelledby="t" className="space-y-3">
        <h2 id="t" className="text-lg font-bold">
          🧩 Pick a ready-made format
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ordered.map((t) => (
            <form key={t.id} action={startPlan}>
              <input type="hidden" name="templateId" value={t.id} />
              {circle && <input type="hidden" name="circleId" value={circle.id} />}
              <button className={`card flex h-full w-full flex-col items-start p-4 text-left transition hover:-translate-y-1 hover:shadow-sticker-lg ${t.id === sp.template ? "bg-sun/40 ring-4 ring-sun" : ""}`}>
                <Doodle category={t.category} className="h-14 w-14" />
                <span className="mt-2 font-display font-bold leading-tight">{t.title}</span>
                <span className="mt-1 text-xs text-muted">{t.summary}</span>
              </button>
            </form>
          ))}
        </div>
      </section>

      <section aria-labelledby="l" className="card space-y-3 bg-lilac/20 p-5">
        <h2 id="l" className="text-lg font-bold">
          🔗 Saw something on TikTok, Instagram or X?
        </h2>
        <p className="text-sm text-muted">
          Paste the link. We&apos;ll credit it and link back — we never copy their video or photos. Then you write your own plan.
        </p>
        <form action={startPlan} className="space-y-3">
          {circle && <input type="hidden" name="circleId" value={circle.id} />}
          <div>
            <label htmlFor="sourceUrl" className="label">
              Link
            </label>
            <input id="sourceUrl" name="sourceUrl" type="url" className="input" placeholder="https://www.tiktok.com/@…" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sourceCredit" className="label">
                Credit (who made it?)
              </label>
              <input id="sourceCredit" name="sourceCredit" className="input" placeholder="@creator on TikTok" maxLength={80} />
            </div>
            <div>
              <label htmlFor="title1" className="label">
                Your plan in a few words
              </label>
              <input id="title1" name="title" className="input" placeholder="Learn to darn socks" maxLength={80} />
            </div>
          </div>
          <SubmitButton className="btn-ghost">Start from this link →</SubmitButton>
        </form>
      </section>

      <section aria-labelledby="o" className="card space-y-3 p-5">
        <h2 id="o" className="text-lg font-bold">
          ✏️ Or start from scratch
        </h2>
        <form action={startPlan} className="flex flex-col gap-3 sm:flex-row">
          {circle && <input type="hidden" name="circleId" value={circle.id} />}
          <label htmlFor="title2" className="sr-only">
            Title
          </label>
          <input id="title2" name="title" className="input" placeholder="e.g. Pickle-making evening" required maxLength={80} />
          <SubmitButton className="btn-primary shrink-0">Let&apos;s go</SubmitButton>
        </form>
      </section>
    </div>
  );
}
