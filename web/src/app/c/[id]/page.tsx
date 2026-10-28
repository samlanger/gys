import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { load } from "@/lib/session-data";
import { activeMembership } from "@/lib/domain/access";
import { circleGarden } from "@/lib/domain/circles";
import { actionCardData, userName } from "@/lib/views";
import { askToShareStory, leaveCircle, repeatPlan, sendMessage, storyConsent, withdrawStory } from "@/app/actions";
import { ActionCard, SampleTag } from "@/components/ActionCard";
import { Avatar } from "@/components/Avatar";
import { Garden } from "@/components/Garden";
import { LocalTime } from "@/components/LocalTime";
import { SubmitButton } from "@/components/SubmitButton";
import { Blob } from "@/components/Doodle";

export const metadata = { title: "Circle" };

export default async function CirclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, ctx, user } = await load();
  if (!user) redirect(`/signin?next=/c/${id}`);
  const circle = db.circles.find((c) => c.id === id);
  if (!circle) notFound();
  const me = activeMembership(db, id, ctx.userId);
  if (!me) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <Blob className="mx-auto h-14 w-14" mood="wow" />
        <h1 className="mt-3 text-2xl font-bold">Circles are private</h1>
        <p className="mt-1 text-muted">Only people who&apos;ve joined one of this Circle&apos;s gatherings can see its conversation and history.</p>
        <Link href="/" className="btn-ghost mt-5">
          Home
        </Link>
      </div>
    );
  }

  const members = db.memberships.filter((m) => m.circleId === id && !m.leftAt);
  const actions = db.actions.filter((a) => a.circleId === id && a.status !== "draft").sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const upcoming = actions.filter((a) => a.status === "published" && new Date(a.startsAt).getTime() > ctx.now.getTime());
  const past = actions.filter((a) => a.status === "completed" || (a.status === "published" && new Date(a.startsAt).getTime() <= ctx.now.getTime()));
  const last = [...past].reverse()[0];
  const myDrafts = db.actions.filter((a) => a.circleId === id && a.status === "draft" && a.hostId === user.id);
  const garden = circleGarden(db, id);
  const stories = db.stories.filter((s) => s.circleId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const thanks = db.appreciations.filter((t) => t.circleId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const messages = db.messages.filter((m) => m.circleId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-40);
  const hosts = new Set(actions.map((a) => a.hostId));
  const nextDate = new Date(ctx.now.getTime() + 14 * 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header className="card overflow-hidden">
        <div className="flex items-center gap-4 bg-sun/40 p-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-paper text-4xl shadow-sticker" aria-hidden>
            {circle.emoji}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold">{circle.name}</h1>
              {circle.isSample && <SampleTag />}
            </div>
            <p className="text-sm">
              {members.length} people · {garden.length} gathering{garden.length === 1 ? "" : "s"} so far · {hosts.size} host{hosts.size === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="p-5">
          <Garden plots={garden} upcoming={upcoming.length > 0} />
        </div>
        <ul className="flex flex-wrap gap-3 border-t-2 border-ink px-5 py-4" aria-label="Members">
          {members.map((m) => (
            <li key={m.userId} className="flex flex-col items-center text-xs">
              <Avatar name={userName(db, m.userId)} />
              <span className="mt-1">
                {userName(db, m.userId)}
                {hosts.has(m.userId) ? " 🧑‍🍳" : ""}
              </span>
            </li>
          ))}
        </ul>
      </header>

      <section aria-labelledby="next" className="space-y-3">
        <h2 id="next" className="text-xl font-bold">
          Next up
        </h2>
        {upcoming.map((a) => (
          <ActionCard key={a.id} a={actionCardData(db, a)} />
        ))}
        {myDrafts.map((a) => (
          <Link key={a.id} href={`/plan/${a.id}/edit`} className="card block bg-cream p-4">
            📝 Your draft: <b>{a.title}</b> — finish it →
          </Link>
        ))}
        {upcoming.length === 0 && (
          <div className="card space-y-3 bg-mint/20 p-5">
            <p className="text-lg font-bold">No next date yet 🗓️</p>
            <p className="text-sm">Anyone here can pick one. Lessons from last time come along automatically.</p>
            {last && (
              <form action={repeatPlan} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="actionId" value={last.id} />
                <input type="hidden" name="circleId" value={id} />
                <div>
                  <label className="label" htmlFor="date">
                    Date
                  </label>
                  <input id="date" name="date" type="date" className="input" defaultValue={nextDate} />
                </div>
                <SubmitButton className="btn-primary">Do “{last.title}” again</SubmitButton>
              </form>
            )}
            <Link href={`/plan/new?circle=${id}`} className="link text-sm">
              …or try something new together
            </Link>
          </div>
        )}
      </section>

      {thanks.length > 0 && (
        <section aria-labelledby="thx" className="space-y-2">
          <h2 id="thx" className="text-xl font-bold">
            Thank-you wall 💌
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {thanks.map((t, i) => (
              <li key={t.id} className={`card p-4 text-sm ${["bg-blush/40", "bg-sun/40", "bg-sky/30", "bg-lilac/30"][i % 4]} ${i % 2 ? "rotate-1" : "-rotate-1"}`}>
                <p>“{t.message}”</p>
                <p className="mt-2 text-xs font-semibold">
                  {userName(db, t.fromId)} → {userName(db, t.toId)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="stories" className="space-y-3">
        <h2 id="stories" className="text-xl font-bold">
          Stories 📖
        </h2>
        {stories.length === 0 && <p className="text-sm text-muted">After a gathering, the host (or anyone) can write down what happened.</p>}
        {stories.map((s) => {
          const mine = s.authorId === user.id;
          const myConsent = s.consents[user.id];
          const counts = Object.values(s.consents);
          const action = db.actions.find((a) => a.id === s.actionId);
          return (
            <article key={s.id} className="card space-y-2 p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`chip ${s.visibility === "public" ? "bg-mint" : s.visibility === "awaiting_consent" ? "bg-sun" : "bg-cream"}`}>
                  {s.visibility === "public" ? "🌍 Public" : s.visibility === "awaiting_consent" ? `⏳ Asking permission (${counts.filter((c) => c === "granted").length}/${counts.length})` : "🔒 Circle only"}
                </span>
                <span className="text-muted">
                  {userName(db, s.authorId)} · {action?.title}
                </span>
              </div>
              <p>{s.whatHappened}</p>
              {s.learned && <p className="text-sm text-muted">Learned: {s.learned}</p>}
              {s.next && <p className="text-sm text-muted">Next: {s.next}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {mine && s.visibility === "private" && (
                  <form action={askToShareStory}>
                    <input type="hidden" name="storyId" value={s.id} />
                    <input type="hidden" name="circleId" value={id} />
                    <SubmitButton className="btn-ghost btn-sm">Ask everyone if we can share it</SubmitButton>
                  </form>
                )}
                {myConsent === "pending" && (
                  <form action={storyConsent} className="flex flex-wrap items-center gap-2 rounded-2xl bg-sun/30 p-2">
                    <span className="text-sm font-semibold">OK to share this publicly?</span>
                    <input type="hidden" name="storyId" value={s.id} />
                    <input type="hidden" name="circleId" value={id} />
                    <button name="granted" value="yes" className="btn-mint btn-sm">
                      Yes
                    </button>
                    <button name="granted" value="no" className="btn-ghost btn-sm">
                      No thanks
                    </button>
                  </form>
                )}
                {(mine || myConsent === "granted") && s.visibility !== "private" && (
                  <form action={withdrawStory}>
                    <input type="hidden" name="storyId" value={s.id} />
                    <input type="hidden" name="circleId" value={id} />
                    <button className="text-xs underline">Make it private again</button>
                  </form>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section id="chat" aria-labelledby="chat-title" className="card overflow-hidden">
        <h2 id="chat-title" className="border-b-2 border-ink bg-cream px-5 py-3 text-lg font-bold">
          💬 Circle chat <span className="text-xs font-normal text-muted">· only members can see this</span>
        </h2>
        <ol className="max-h-[28rem] space-y-3 overflow-y-auto p-5">
          {messages.map((m) => {
            const mine = m.userId === user.id;
            return (
              <li key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar name={userName(db, m.userId)} size="sm" />
                <div className={`max-w-[80%] rounded-2xl border-2 border-ink px-3 py-2 text-sm ${mine ? "bg-sky/40" : "bg-paper"}`}>
                  {!mine && <p className="text-xs font-bold">{userName(db, m.userId)}</p>}
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className="mt-1 flex justify-between gap-3 text-[10px] text-muted">
                    <LocalTime iso={m.createdAt} mode="short" />
                    {!mine && (
                      <Link href={`/report?type=message&id=${m.id}`} className="underline">
                        report
                      </Link>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
          {messages.length === 0 && <li className="text-sm text-muted">Say hello 👋</li>}
        </ol>
        <form action={sendMessage} className="flex gap-2 border-t-2 border-ink p-3">
          <input type="hidden" name="circleId" value={id} />
          <label htmlFor="body" className="sr-only">
            Message
          </label>
          <input id="body" name="body" className="input" placeholder="Message the Circle…" maxLength={1000} required autoComplete="off" />
          <SubmitButton className="btn-primary shrink-0 px-4" pendingText="…">
            Send
          </SubmitButton>
        </form>
      </section>

      {past.length > 0 && (
        <section aria-labelledby="hist" className="space-y-2">
          <h2 id="hist" className="text-xl font-bold">
            Our history
          </h2>
          <ol className="relative space-y-3 border-l-4 border-dashed border-ink/20 pl-5">
            {[...past].reverse().map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[30px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-mint text-[10px]">✓</span>
                <Link href={`/a/${a.slug}`} className="font-semibold hover:underline">
                  {a.title}
                </Link>
                <p className="text-xs text-muted">
                  <LocalTime iso={a.startsAt} mode="date" /> · hosted by {userName(db, a.hostId)} ·{" "}
                  {db.rsvps.filter((r) => r.actionId === a.id && r.status === "confirmed").length} people
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href={`/report?type=circle&id=${id}`} className="text-muted underline">
          Report a concern
        </Link>
        <form action={leaveCircle}>
          <input type="hidden" name="circleId" value={id} />
          <button className="text-muted underline">Leave this Circle</button>
        </form>
      </footer>
    </div>
  );
}
