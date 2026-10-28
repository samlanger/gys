import Link from "next/link";
import { notFound } from "next/navigation";
import { load } from "@/lib/session-data";
import { canAdapt, ADAPTABLE_FIELDS, lineage } from "@/lib/domain/adapt";
import { adapt } from "@/app/actions";
import { Doodle } from "@/components/Doodle";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Try this with your people" };

const LABELS: Record<(typeof ADAPTABLE_FIELDS)[number], string> = {
  title: "Title",
  summary: "Invitation line",
  whatToExpect: "What to expect",
  category: "Kind of thing",
  durationMins: "How long it takes",
  effort: "Effort level",
  costLabel: "Cost",
  accessibility: "Accessibility notes (check they fit your venue!)",
  roles: "Small roles",
  lessons: "Lessons learned",
};

export default async function Adapt({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { db, ctx, user } = await load();
  const a = db.actions.find((x) => x.slug === slug);
  if (!a || a.visibility !== "public") notFound();
  if (!canAdapt(a)) {
    return (
      <div className="card p-6">
        <h1 className="text-2xl font-bold">This format isn&apos;t open for adapting</h1>
        <p className="mt-2">The host hasn&apos;t shared it. You can still start your own idea from scratch.</p>
        <Link href="/plan/new" className="btn-primary mt-4">
          Make a plan
        </Link>
      </div>
    );
  }
  const circle = db.circles.find((c) => c.id === a.circleId);
  const lin = lineage(db, a);
  const approved = user?.hostStatus === "approved";

  return (
    <div className="space-y-5">
      <header className="card overflow-hidden">
        <div className="flex items-center gap-4 bg-mint/40 p-5">
          <Doodle category={a.category} className="h-20 w-20 shrink-0 animate-float" />
          <div>
            <p className="text-sm font-semibold">Try this with your people 🌱</p>
            <h1 className="text-2xl font-bold">{a.title}</h1>
            <p className="text-sm">
              A format from {circle?.name ?? "another group"}
              {lin.descendants > 0 ? ` · already tried by ${lin.descendants} other group${lin.descendants === 1 ? "" : "s"}` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-bold">✅ What comes with it</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {ADAPTABLE_FIELDS.map((k) => (
              <li key={k}>• {LABELS[k]}</li>
            ))}
            <li>• Credit to the original idea{a.sourceCredit ? ` (${a.sourceCredit})` : ""}</li>
          </ul>
        </section>
        <section className="card bg-cream p-5">
          <h2 className="font-bold">🔒 What stays with them</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Their address and arrival notes</li>
            <li>• Who came, and who took which role</li>
            <li>• Their chat, stories and feedback</li>
            <li>• Their invitation links and dates</li>
          </ul>
        </section>
      </div>

      <section className="card space-y-2 p-5 text-sm">
        <h2 className="text-base font-bold">You choose</h2>
        <p>🧑‍🍳 You&apos;re the host · 📅 your date · 📍 your public or partner venue · 👥 your group size</p>
        <p className="text-muted">
          Your group will be independent: the original hosts aren&apos;t running it and won&apos;t be shown as endorsing it.{" "}
          {approved ? "You're a reviewed host, so you can publish straight away." : "Before it goes live, someone on the pilot team gives it a quick, friendly check."}
        </p>
      </section>

      {ctx.userId ? (
        <form action={adapt}>
          <input type="hidden" name="actionId" value={a.id} />
          <input type="hidden" name="slug" value={a.slug} />
          <SubmitButton className="btn-mint w-full text-lg">Copy the format into my draft →</SubmitButton>
        </form>
      ) : (
        <Link href={`/signin?next=/adapt/${a.slug}`} className="btn-mint w-full text-lg">
          Sign in to start →
        </Link>
      )}
    </div>
  );
}
