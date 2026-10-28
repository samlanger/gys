import Link from "next/link";
import { redirect } from "next/navigation";
import { load } from "@/lib/session-data";
import { circleGarden } from "@/lib/domain/circles";
import { actionCardData, userName } from "@/lib/views";
import { requestDeletion, savePrefs, signOut } from "@/app/actions";
import { ActionCard } from "@/components/ActionCard";
import { Garden } from "@/components/Garden";
import { LocalTime } from "@/components/LocalTime";
import { SubmitButton } from "@/components/SubmitButton";
import { MarkRead } from "./MarkRead";
import { AppealForm } from "./AppealForm";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "You" };

const HOST_STATUS: Record<string, string> = {
  none: "Not hosted yet — your first plan gets a quick, friendly review.",
  pending: "Your first plan is with the pilot team for review.",
  approved: "Reviewed host ✓ — you can publish straight away.",
  suspended: "Hosting is paused on your account. You can appeal below.",
};

export default async function Me() {
  const { db, ctx, user } = await load();
  if (!user) redirect("/signin?next=/me");
  const now = ctx.now.getTime();
  const notes = db.notifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);
  const unread = notes.some((n) => !n.readAt);
  const going = db.rsvps
    .filter((r) => r.userId === user.id && r.status !== "cancelled")
    .map((r) => db.actions.find((a) => a.id === r.actionId)!)
    .filter((a) => a && a.status === "published" && new Date(a.startsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const hosting = db.actions.filter((a) => a.hostId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const circles = db.memberships.filter((m) => m.userId === user.id && !m.leftAt).map((m) => db.circles.find((c) => c.id === m.circleId)!).filter(Boolean);
  const thanks = db.appreciations.filter((t) => t.toId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-8">
      {unread && <MarkRead />}
      <header className="flex items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Hi, {user.name}</h1>
          <p className="text-sm text-muted">{HOST_STATUS[user.hostStatus]}</p>
        </div>
        <form action={signOut}>
          <button className="text-sm underline">Sign out</button>
        </form>
      </header>

      {user.deletionRequestedAt && (
        <p className="card bg-blush p-4 text-sm">Deletion requested on <LocalTime iso={user.deletionRequestedAt} mode="date" />. An operator will complete it.</p>
      )}

      {notes.length > 0 && (
        <section aria-labelledby="news" className="space-y-2">
          <h2 id="news" className="text-xl font-bold">
            News
          </h2>
          <ul className="card divide-y-2 divide-ink/10">
            {notes.map((n) => (
              <li key={n.id}>
                <Link href={n.href} className={`flex items-center gap-3 px-4 py-3 text-sm hover:bg-cream ${n.readAt ? "" : "font-bold"}`}>
                  {!n.readAt && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-tomato" aria-label="new" />}
                  <span className="flex-1">{n.text}</span>
                  <span className="text-xs font-normal text-muted">
                    <LocalTime iso={n.createdAt} mode="short" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="going" className="space-y-3">
        <h2 id="going" className="text-xl font-bold">
          You&apos;re going to
        </h2>
        {going.length === 0 ? (
          <div className="card p-5 text-sm">
            Nothing yet. <Link href="/" className="link">See what&apos;s happening</Link> or <Link href="/plan/new" className="link">make a plan</Link>.
          </div>
        ) : (
          going.map((a) => <ActionCard key={a.id} a={actionCardData(db, a)} />)
        )}
      </section>

      <section id="circles" aria-labelledby="circles-t" className="scroll-mt-20 space-y-3">
        <h2 id="circles-t" className="text-xl font-bold">
          Your Circles
        </h2>
        {circles.length === 0 && <p className="card p-5 text-sm">When you join a gathering, you become part of its Circle — the people who keep doing things together.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {circles.map((c) => (
            <Link key={c.id} href={`/c/${c.id}`} className="card block overflow-hidden transition hover:-translate-y-0.5">
              <div className="flex items-center gap-2 border-b-2 border-ink bg-sun/30 px-4 py-3">
                <span className="text-2xl" aria-hidden>
                  {c.emoji}
                </span>
                <b>{c.name}</b>
              </div>
              <div className="p-3">
                <Garden plots={circleGarden(db, c.id)} compact />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {hosting.length > 0 && (
        <section aria-labelledby="hosting" className="space-y-3">
          <h2 id="hosting" className="text-xl font-bold">
            You&apos;re hosting
          </h2>
          {hosting.map((a) => (
            <ActionCard key={a.id} a={actionCardData(db, a)} href={a.status === "draft" ? `/plan/${a.id}/edit` : `/plan/${a.id}/manage`} />
          ))}
        </section>
      )}

      {thanks.length > 0 && (
        <section aria-labelledby="thx" className="space-y-2">
          <h2 id="thx" className="text-xl font-bold">
            People said thanks 💌
          </h2>
          <ul className="space-y-2">
            {thanks.map((t) => (
              <li key={t.id} className="card bg-blush/30 p-4 text-sm">
                “{t.message}” <span className="text-muted">— {userName(db, t.fromId)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="settings" aria-labelledby="set" className="scroll-mt-20 space-y-3">
        <h2 id="set" className="text-xl font-bold">
          Settings &amp; your data
        </h2>
        <form action={savePrefs} className="card space-y-3 p-5">
          <p className="font-bold">Notifications</p>
          {[
            { k: "email", t: "Email me about plans I've joined", v: user.notify.email },
            { k: "reminders", t: "Remind me the day before", v: user.notify.reminders },
            { k: "circleMessages", t: "Tell me about new Circle messages", v: user.notify.circleMessages },
          ].map((o) => (
            <label key={o.k} className="flex items-center gap-3">
              <input type="checkbox" name={o.k} defaultChecked={o.v} className="h-5 w-5 accent-tomato" />
              {o.t}
            </label>
          ))}
          <p className="text-xs text-muted">No streaks, no “you&apos;re missing out” nudges. Ever.</p>
          <SubmitButton className="btn-ghost btn-sm">Save</SubmitButton>
        </form>
        <div className="card space-y-2 p-5">
          <p className="font-bold">Your data</p>
          <a href="/api/export" className="btn-ghost btn-sm">
            ⬇️ Download everything about me (JSON)
          </a>
          <details className="pt-2">
            <summary className="cursor-pointer text-sm underline">Delete my account</summary>
            <form action={requestDeletion} className="mt-3 space-y-2">
              <p className="text-sm">We&apos;ll remove your profile, messages and private feedback, and give up any places you hold. Type DELETE to confirm.</p>
              <label htmlFor="confirm" className="sr-only">
                Type DELETE
              </label>
              <input id="confirm" name="confirm" className="input" autoComplete="off" />
              <SubmitButton className="btn-ghost btn-sm">Request deletion</SubmitButton>
            </form>
          </details>
        </div>
        <AppealForm />
      </section>
    </div>
  );
}
