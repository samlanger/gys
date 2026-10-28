import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { load } from "@/lib/session-data";
import { canViewAction, invitationState } from "@/lib/domain/access";
import { buildPublicView } from "@/lib/views";
import { Doodle, EFFORT, Blob } from "@/components/Doodle";
import { LocalTime, Countdown } from "@/components/LocalTime";
import { SampleTag, SpotsBadge } from "@/components/ActionCard";
import { Avatar } from "@/components/Avatar";
import { JoinPanel } from "./JoinPanel";
import { AfterPanel } from "./AfterPanel";
import { TrackVisit } from "./TrackVisit";
import { Confetti } from "@/components/Confetti";
import { getStore } from "@/lib/store";

type Params = { slug: string };
type Search = { i?: string; c?: string; ch?: string; joined?: string; autojoin?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getStore().read().actions.find((x) => x.slug === slug);
  if (!a || a.visibility !== "public" || (a.status !== "published" && a.status !== "completed")) return { title: "An invitation" };
  return {
    title: a.title,
    description: a.summary,
    openGraph: { title: a.title, description: a.summary, images: [`/api/share-image/${a.slug}?format=square`] },
    twitter: { card: "summary_large_image", images: [`/api/share-image/${a.slug}?format=wide`] },
  };
}

export default async function ActionPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { db, ctx } = await load();
  const action = db.actions.find((a) => a.slug === slug);
  if (!action) notFound();

  if (!canViewAction(db, action, ctx, sp.i)) {
    const state = invitationState(db, action.id, sp.i, ctx.now);
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <Blob className="mx-auto h-16 w-16" mood="wow" />
        <h1 className="mt-4 text-2xl font-bold">{state === "expired" ? "This invitation has expired" : "This one's invite-only"}</h1>
        <p className="mt-2 text-muted">
          {state === "expired"
            ? "Invitation links only work for a limited time. Ask the person who invited you for a fresh link."
            : "You'll need an invitation link from the host to see this plan."}
        </p>
        {!ctx.userId && (
          <p className="mt-4 text-sm">
            Already in this Circle?{" "}
            <Link className="link" href={`/signin?next=/a/${slug}`}>
              Sign in
            </Link>
          </p>
        )}
        <Link href="/" className="btn-ghost mt-6">
          Back home
        </Link>
      </div>
    );
  }

  const v = buildPublicView(db, ctx, action);
  const started = new Date(v.startsAt).getTime() <= ctx.now.getTime();
  const effort = EFFORT[v.effort];
  const hours = v.durationMins >= 60 ? `${Math.round((v.durationMins / 60) * 2) / 2} hours` : `${v.durationMins} mins`;
  const end = new Date(new Date(v.startsAt).getTime() + v.durationMins * 60_000).toISOString();
  const circleMembers = v.circle
    ? db.memberships
        .filter((m) => m.circleId === v.circle!.id && !m.leftAt && m.userId !== ctx.userId)
        .map((m) => ({ id: m.userId, name: db.users.find((u) => u.id === m.userId)?.name ?? "Someone" }))
    : [];

  return (
    <article className="space-y-6">
      {sp.c && <TrackVisit actionId={v.id} code={sp.c} channel={sp.ch ?? ""} />}
      {sp.joined && <Confetti />}

      {v.status === "cancelled" && (
        <div className="card bg-blush p-4" role="alert">
          <b>This plan was cancelled.</b> {v.cancelReason && <span>Host&apos;s note: “{v.cancelReason}”</span>}
        </div>
      )}
      {(v.status === "draft" || v.status === "in_review") && (
        <div className="card bg-lilac/40 p-4 text-sm">
          👀 Preview — only you{v.viewer.isHost ? "" : " and operators"} can see this. It&apos;s {v.status === "draft" ? "a draft" : "waiting for pilot review"}.
        </div>
      )}

      {/* Invitation ticket */}
      <header className="card relative overflow-hidden">
        <div className="flex items-start gap-4 border-b-2 border-dashed border-ink/40 p-5">
          <Doodle category={v.category} className="h-24 w-24 shrink-0 animate-float" />
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <SpotsBadge spotsLeft={v.spotsLeft} status={v.status} />
              {v.visibility === "invite" && <span className="chip bg-lilac">💌 Invite-only</span>}
              {v.isSample && <SampleTag />}
            </div>
            <h1 className="text-3xl font-bold leading-tight">{v.title}</h1>
            <p className="mt-2 text-lg">{v.summary}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-ink/10 text-sm">
          {[
            { k: "When", e: "📅", val: <><LocalTime iso={v.startsAt} mode="date" /><br /><LocalTime iso={v.startsAt} mode="time" />–<LocalTime iso={end} mode="time" /></> },
            { k: "Where", e: "📍", val: <>{v.venueName}<br /><span className="text-muted">{v.areaLabel}</span></> },
            { k: "Cost", e: "💷", val: v.costLabel },
            { k: "Effort", e: effort.emoji, val: <>{effort.label} · {hours}</> },
          ].map((row) => (
            <div key={row.k} className="bg-paper p-4">
              <dt className="font-display text-xs font-semibold uppercase tracking-wide text-muted">
                <span aria-hidden>{row.e}</span> {row.k}
              </dt>
              <dd className="mt-1 font-semibold">{row.val}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Seats */}
      <section aria-label="Places" className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {v.confirmed} of {v.capacity} places taken
          </h2>
          {!started && v.status === "published" && (
            <span className="text-sm font-semibold text-muted">
              <Countdown iso={v.startsAt} />
            </span>
          )}
        </div>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Who's coming">
          {v.people.map((p, i) => (
            <li key={i} className="flex flex-col items-center gap-1">
              <Avatar name={p.name} />
            </li>
          ))}
          {Array.from({ length: v.spotsLeft }).map((_, i) => (
            <li key={`open${i}`} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-ink/50 text-ink/40" aria-label="Open place">
              ＋
            </li>
          ))}
        </ul>
        {v.waitlist > 0 && <p className="mt-2 text-sm text-muted">{v.waitlist} on the waitlist</p>}
        {!v.people[0]?.name && v.confirmed > 0 && <p className="mt-2 text-xs text-muted">Names are only shown to people who are coming.</p>}
      </section>

      {v.status === "published" && !started && (
        <JoinPanel
          v={v}
          invite={sp.i}
          campaign={sp.c}
          channel={sp.ch}
          justJoined={sp.joined === "confirmed" || sp.joined === "waitlisted" ? sp.joined : undefined}
          autojoin={sp.autojoin === "1"}
          endIso={end}
        />
      )}

      {started && v.viewer.rsvpStatus === "confirmed" && v.status !== "cancelled" && (
        <AfterPanel v={v} members={circleMembers} />
      )}

      {/* Details */}
      <section className="card space-y-5 p-5">
        <div>
          <h2 className="text-lg font-bold">What to expect</h2>
          <p className="mt-1 whitespace-pre-line">{v.whatToExpect || "The host will share more soon."}</p>
        </div>
        <div className="rounded-2xl bg-sky/20 p-4">
          <h2 className="font-bold">♿ Accessibility</h2>
          <p className="mt-1 whitespace-pre-line text-sm">{v.accessibility}</p>
          <p className="mt-2 text-xs text-muted">Need something else? Message the host after you join — they&apos;d love to know.</p>
        </div>
        {v.lessons.length > 0 && (
          <div>
            <h2 className="font-bold">💡 What earlier groups learned</h2>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
              {v.lessons.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}
        {v.roles.length > 0 && (
          <div>
            <h2 className="font-bold">🙌 Small ways to pitch in (optional)</h2>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {v.roles.map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-2xl border-2 border-ink/15 p-3 text-sm">
                  <span className="text-2xl" aria-hidden>
                    {r.emoji}
                  </span>
                  <span className="flex-1">
                    <b>{r.name}</b>
                    <span className="block text-muted">{r.description}</span>
                  </span>
                  <span className={`text-xs font-bold ${r.taken >= r.capacity ? "text-mint" : "text-muted"}`}>
                    {r.taken >= r.capacity ? "✓ covered" : `${r.capacity - r.taken} open`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Host & credit */}
      <section className="card flex items-start gap-4 p-5">
        <Avatar name={v.host.name} size="lg" />
        <div className="min-w-0 flex-1 text-sm">
          <p>
            Hosted by <b className="text-base">{v.host.name}</b>
          </p>
          {v.host.bio && <p className="text-muted">{v.host.bio}</p>}
          <p className="mt-1 text-xs text-muted">Pilot hosts are reviewed by a person before their first gathering. Venues are public or partner spaces.</p>
          {v.sourceUrl && (
            <p className="mt-3">
              💡 Inspired by{" "}
              <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="link break-all">
                {v.sourceCredit || new URL(v.sourceUrl).hostname}
              </a>
              <span className="block text-xs text-muted">Linked and credited — the creator isn&apos;t involved unless they say so.</span>
            </p>
          )}
          {v.lineage.origin && (
            <p className="mt-3">
              🌱 Format from{" "}
              <Link href={`/a/${v.lineage.origin.slug}`} className="link">
                {v.lineage.origin.circleName ?? v.lineage.origin.title}
              </Link>
              <span className="block text-xs text-muted">This is an independent group. The original hosts aren&apos;t running or endorsing it.</span>
            </p>
          )}
          {v.lineage.descendants > 0 && (
            <p className="mt-3 font-semibold">
              🌍 {v.lineage.descendants} other group{v.lineage.descendants === 1 ? " has" : "s have"} tried this format
            </p>
          )}
        </div>
      </section>

      {/* Spread */}
      {v.adaptable && (
        <section className="card overflow-hidden bg-mint/30 p-5">
          <h2 className="text-xl font-bold">Love this idea? 🌱</h2>
          <p className="mt-1">Run it with your own people — your street, your office, your group chat. We&apos;ll copy the format; you choose the date, place and size.</p>
          <Link href={`/adapt/${v.slug}`} className="btn-mint mt-4">
            Try this with your people
          </Link>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 text-sm">
        {v.viewer.canManage ? (
          <Link href={`/plan/${v.id}/manage`} className="btn-sun btn-sm">
            Manage this plan
          </Link>
        ) : (
          <span />
        )}
        {ctx.userId && (
          <Link href={`/report?type=action&id=${v.id}`} className="text-muted underline">
            Report a concern
          </Link>
        )}
      </footer>
    </article>
  );
}
