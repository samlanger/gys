import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { load } from "@/lib/session-data";
import { canManageAction } from "@/lib/domain/access";
import { circleGarden } from "@/lib/domain/circles";
import { completePlan, markAttendance, repeatPlan, thank, writeStory } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { Garden } from "@/components/Garden";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Wrap up" };

const ATT: Record<string, string> = {
  unknown: "not reported",
  self_reported: "says they came",
  host_confirmed: "✓ you confirmed",
  absent: "didn't make it",
};

export default async function Wrap({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, ctx, user } = await load();
  if (!user) redirect(`/signin?next=/plan/${id}/wrap`);
  const a = db.actions.find((x) => x.id === id);
  if (!a) notFound();
  if (!canManageAction(db, a, ctx.userId)) return <p className="card p-6">Only the host can wrap up.</p>;
  if (new Date(a.startsAt).getTime() > ctx.now.getTime()) {
    return (
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Not yet!</h1>
        <p>Come back after the gathering to wrap up and plan the next one.</p>
      </div>
    );
  }
  const confirmed = db.rsvps.filter((r) => r.actionId === a.id && r.status === "confirmed");
  const name = (uid: string) => db.users.find((u) => u.id === uid)?.name ?? "Someone";
  const garden = a.circleId ? circleGarden(db, a.circleId) : [];
  const hasStory = db.stories.some((s) => s.actionId === a.id);
  const nextDefault = new Date(new Date(a.startsAt).getTime() + 14 * 86_400_000);
  const nextDate = (nextDefault.getTime() < ctx.now.getTime() ? new Date(ctx.now.getTime() + 7 * 86_400_000) : nextDefault).toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <header>
        <Link href={`/plan/${a.id}/manage`} className="block w-fit text-sm text-muted underline">
          ← host page
        </Link>
        <h1 className="mt-2 text-3xl font-bold">How did “{a.title}” go?</h1>
        <p className="text-muted">Four small steps. The last one is the best one.</p>
      </header>

      {a.status === "published" ? (
        <form action={completePlan} className="card flex flex-wrap items-center justify-between gap-3 bg-mint/30 p-5">
          <input type="hidden" name="actionId" value={a.id} />
          <div>
            <p className="text-lg font-bold">1 · Mark it as happened</p>
            <p className="text-sm">Your Circle&apos;s garden grows a new plant 🌱 and people get a gentle ask for private feedback.</p>
          </div>
          <SubmitButton className="btn-mint">It happened!</SubmitButton>
        </form>
      ) : (
        <section className="card p-5">
          <p className="text-lg font-bold">1 · It happened ✓</p>
          {garden.length > 0 && (
            <div className="mt-3">
              <Garden plots={garden} compact />
            </div>
          )}
        </section>
      )}

      <section className="card p-5" aria-labelledby="att">
        <h2 id="att" className="text-lg font-bold">
          2 · Who came?
        </h2>
        <p className="text-sm text-muted">Signing up isn&apos;t the same as showing up — we keep them separate and never guess.</p>
        <ul className="mt-3 divide-y-2 divide-ink/10">
          {confirmed.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2">
              <Avatar name={name(r.userId)} size="sm" />
              <span className="flex-1">
                <b>{name(r.userId)}</b> <span className="text-xs text-muted">· {ATT[r.attendance]}</span>
              </span>
              <form action={markAttendance} className="flex gap-1">
                <input type="hidden" name="rsvpId" value={r.id} />
                <input type="hidden" name="actionId" value={a.id} />
                <button name="attended" value="yes" className={`btn-sm btn ${r.attendance === "host_confirmed" ? "bg-mint" : "bg-paper"}`} aria-label={`${name(r.userId)} came`}>
                  ✓
                </button>
                <button name="attended" value="no" className={`btn-sm btn ${r.attendance === "absent" ? "bg-blush" : "bg-paper"}`} aria-label={`${name(r.userId)} didn't come`}>
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {a.circleId && (
        <form action={writeStory} className="card space-y-3 p-5">
          <h2 className="text-lg font-bold">3 · Tell the story {hasStory && <span className="chip ml-2 bg-mint text-xs">one saved ✓</span>}</h2>
          <p className="text-sm text-muted">Saved privately in your Circle. You can ask everyone&apos;s permission to share it publicly later.</p>
          <input type="hidden" name="actionId" value={a.id} />
          <input type="hidden" name="back" value={`/plan/${a.id}/wrap`} />
          <div>
            <label className="label" htmlFor="whatHappened">
              What happened?
            </label>
            <textarea id="whatHappened" name="whatHappened" className="input" rows={3} required placeholder="Seven of us, seven broken things…" />
          </div>
          <div>
            <label className="label" htmlFor="learned">
              What did you learn?
            </label>
            <textarea id="learned" name="learned" className="input" rows={2} placeholder="Tea before teaching." />
          </div>
          <div>
            <label className="label" htmlFor="lessons">
              Lessons to carry into the next one (one per line)
            </label>
            <textarea id="lessons" name="lessons" className="input" rows={2} placeholder="Pre-thread needles" />
          </div>
          <div>
            <label className="label" htmlFor="next">
              What&apos;s next?
            </label>
            <input id="next" name="next" className="input" placeholder="Dev will host a jeans edition" />
          </div>
          <SubmitButton className="btn-ghost">Save story</SubmitButton>
        </form>
      )}

      {a.circleId && confirmed.length > 0 && (
        <form action={thank} className="card space-y-3 bg-blush/30 p-5">
          <h2 className="text-lg font-bold">💌 Thank someone specific</h2>
          <input type="hidden" name="actionId" value={a.id} />
          <input type="hidden" name="back" value={`/plan/${a.id}/wrap`} />
          <label className="sr-only" htmlFor="toId">
            Who
          </label>
          <select id="toId" name="toId" className="input">
            {confirmed
              .filter((r) => r.userId !== user.id)
              .map((r) => (
                <option key={r.userId} value={r.userId}>
                  {name(r.userId)}
                  {r.roleSlotId ? ` (${a.roles.find((x) => x.id === r.roleSlotId)?.name ?? "helped"})` : ""}
                </option>
              ))}
          </select>
          <label className="sr-only" htmlFor="message">
            Message
          </label>
          <input id="message" name="message" className="input" placeholder="Thanks for bringing the spare scissors!" required minLength={3} maxLength={200} />
          <SubmitButton className="btn-ghost btn-sm">Send thanks</SubmitButton>
        </form>
      )}

      {a.circleId && (
        <form action={repeatPlan} className="card space-y-3 bg-sun/40 p-5">
          <h2 className="text-xl font-bold">4 · Let&apos;s do it again 🔁</h2>
          <p className="text-sm">We&apos;ll copy everything — roles, lessons, venue — into a new draft. Anyone in the Circle can host it, so it doesn&apos;t always have to be you.</p>
          <input type="hidden" name="actionId" value={a.id} />
          <input type="hidden" name="circleId" value={a.circleId} />
          <label className="label" htmlFor="date">
            Next date
          </label>
          <input id="date" name="date" type="date" className="input" defaultValue={nextDate} />
          <SubmitButton className="btn-primary w-full">Plan the next one →</SubmitButton>
        </form>
      )}
    </div>
  );
}
