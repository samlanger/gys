import Link from "next/link";
import { redirect } from "next/navigation";
import { load } from "@/lib/session-data";
import { pilotMetrics } from "@/lib/domain/ops";
import { userName } from "@/lib/views";
import {
  opsAppeal,
  opsDeletion,
  opsFounderPrompted,
  opsHostStatus,
  opsLogSupport,
  opsRemoveMessage,
  opsResolveReport,
  opsReview,
} from "@/app/actions";
import { LocalTime } from "@/components/LocalTime";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Operator" };

function Stat({ n, label, tone = "bg-paper", note }: { n: React.ReactNode; label: string; tone?: string; note?: string }) {
  return (
    <div className={`rounded-2xl border-2 border-ink p-3 ${tone}`}>
      <p className="font-display text-2xl font-bold">{n}</p>
      <p className="text-xs font-semibold">{label}</p>
      {note && <p className="mt-1 text-[11px] text-muted">{note}</p>}
    </div>
  );
}

export default async function Ops({ searchParams }: { searchParams: Promise<{ sample?: string }> }) {
  const { sample } = await searchParams;
  const { db, ctx, user } = await load();
  if (!user) redirect("/signin?next=/ops");
  if (!user.isOperator) return <p className="card p-6">Operators only.</p>;
  const includeSample = sample === "1";
  const m = pilotMetrics(db, ctx, includeSample);
  const review = db.actions.filter((a) => a.status === "in_review");
  const reports = db.reports.filter((r) => r.status === "open");
  const appeals = db.appeals.filter((a) => a.status === "open");
  const deletions = db.users.filter((u) => u.deletionRequestedAt && u.name !== "Former member");
  const hosts = db.users.filter((u) => u.hostStatus !== "none" && !u.isOperator);
  const liveActions = db.actions.filter((a) => a.status === "published" || a.status === "completed").sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const feedback = db.feedback.filter((f) => includeSample || !db.actions.find((a) => a.id === f.actionId)?.isSample);
  const avgWorth = feedback.length ? Math.round((feedback.reduce((s, f) => s + f.worthIt, 0) / feedback.length) * 10) / 10 : "—";
  const returnPct = feedback.length ? `${Math.round((feedback.filter((f) => f.wouldReturn).length / feedback.length) * 100)}%` : "—";
  const pct = m.matureCircles ? `${Math.round((m.matureWithSecondIn28 / m.matureCircles) * 100)}%` : "—";
  const describe = (type: string, id: string) => {
    if (type === "action") return db.actions.find((a) => a.id === id)?.title ?? id;
    if (type === "message") return `“${db.messages.find((x) => x.id === id)?.body.slice(0, 80) ?? "?"}”`;
    if (type === "circle") return db.circles.find((c) => c.id === id)?.name ?? id;
    if (type === "user") return userName(db, id);
    return id;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Pilot operations</h1>
          <p className="text-sm text-muted">Help hosts personally — and record it, so we can tell founder effort from independent return.</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          {["metrics", "review", "reports", "appeals", "accounts", "actions", "support", "audit"].map((s) => (
            <a key={s} href={`#${s}`} className="chip hover:bg-sun">
              {s}
            </a>
          ))}
        </nav>
      </header>

      <section id="metrics" className="scroll-mt-20 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Learning criteria</h2>
          <Link href={includeSample ? "/ops" : "/ops?sample=1"} className="chip">
            {includeSample ? "🧪 Including sample data — show real only" : "Real data only — include sample data"}
          </Link>
        </div>
        {m.includesSample && <p className="rounded-2xl bg-sun/50 p-3 text-sm font-semibold">These numbers include SAMPLE data and say nothing about the real pilot.</p>}
        <p className="text-xs text-muted">Proposed learning criteria, not proven benchmarks.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card space-y-2 p-4">
            <p className="font-bold">1 · Worthwhile, and people return</p>
            <div className="grid grid-cols-3 gap-2">
              <Stat n={avgWorth} label="avg “worth it” /5" note={`${feedback.length} responses`} />
              <Stat n={returnPct} label="say they'd return" />
              <Stat n={m.repeatParticipants} label="came to 2+" note="self-reported or host-confirmed" />
            </div>
          </div>
          <div className="card space-y-2 p-4">
            <p className="font-bold">2 · Second action within 28 days</p>
            <div className="grid grid-cols-2 gap-2">
              <Stat n={pct} label="of mature Circles" tone={m.matureCircles && m.matureWithSecondIn28 / m.matureCircles >= 0.5 ? "bg-mint/40" : "bg-paper"} note="target: at least half" />
              <Stat n={`${m.matureWithSecondIn28}/${m.matureCircles}`} label="mature Circles" note="first gathering ≥28 days ago" />
            </div>
          </div>
          <div className="card space-y-2 p-4">
            <p className="font-bold">3 · Responsibility spreads</p>
            <div className="grid grid-cols-2 gap-2">
              <Stat n={m.circlesWithSharedHosting} label="Circles with 2+ hosts" />
              <Stat n={m.rolesTaken} label="roles taken" />
            </div>
          </div>
          <div className="card space-y-2 p-4">
            <p className="font-bold">4 · New hosts adapt formats</p>
            <div className="grid grid-cols-3 gap-2">
              <Stat n={m.adaptations.live} label="adaptations live" />
              <Stat n={m.adaptations.independentHosts} label="independent hosts" note="not founder-prompted" />
              <Stat n={m.adaptations.drafts} label="in draft/review" />
            </div>
          </div>
          <div className="card space-y-2 p-4 sm:col-span-2">
            <p className="font-bold">5 · Paid continuation</p>
            <p className="text-sm text-muted">Not tracked in-app: payments are deliberately out of scope. Record offers and acceptances manually in the support log.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat n={m.founderPromptedActions} label="founder-prompted actions" />
          <Stat n={m.independentActions} label="independent actions" />
          <Stat n={m.supportMinutes} label="support minutes" />
          <Stat n={m.openReports} label="open reports" tone={m.openReports ? "bg-blush" : "bg-paper"} />
          <Stat n={m.departures.leftCircles} label="left a Circle" />
          <Stat n={m.departures.cancelledRsvps} label="cancelled places" />
          <Stat n={m.negativeExperiences} label="negative experiences" note="worth-it ≤2 or didn't feel welcome" />
          <Stat n={m.missingFeedback} label="missing feedback" />
        </div>
        <div className="card overflow-x-auto p-4">
          <p className="font-bold">Campaigns &amp; attendance</p>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-1">Channel</th>
                <th>Visits</th>
                <th>Joins</th>
                <th>Shares started*</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(m.campaign).map(([ch, v]) => (
                <tr key={ch} className="border-t border-ink/10">
                  <td className="py-1 font-semibold">{ch === "unknown" ? "unknown (code, no channel)" : ch}</td>
                  <td>{v.visits}</td>
                  <td>{v.joins}</td>
                  <td>{v.sharesOpened}</td>
                </tr>
              ))}
              <tr className="border-t border-ink/10">
                <td className="py-1 font-semibold">no attribution</td>
                <td>—</td>
                <td>{m.joinsWithoutAttribution}</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">*A share sheet opening is not proof of a post. Joins without a code are labelled “no attribution”, not guessed.</p>
          <p className="mt-3 text-sm">
            RSVPs confirmed: <b>{m.rsvpsConfirmed}</b> · self-reported attendance: <b>{m.attendanceSelfReported}</b> · host-confirmed: <b>{m.attendanceHostConfirmed}</b> · independently verified: <b>0</b>{" "}
            <span className="text-xs text-muted">(no verification method yet)</span>
          </p>
        </div>
      </section>

      <section id="review" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold">Host &amp; plan review ({review.length})</h2>
        {review.length === 0 && <p className="text-sm text-muted">Nothing waiting.</p>}
        {review.map((a) => {
          const host = db.users.find((u) => u.id === a.hostId);
          const src = a.adaptedFromId ? db.actions.find((x) => x.id === a.adaptedFromId) : undefined;
          return (
            <article key={a.id} className="card space-y-2 p-5 text-sm">
              <p className="text-lg font-bold">{a.title}</p>
              <p>
                Host: <b>{host?.name}</b> ({host?.email}) · host status: {host?.hostStatus}
              </p>
              {src && <p>🌱 Adapted from “{src.title}” ({db.circles.find((c) => c.id === src.circleId)?.name})</p>}
              <p>
                📅 <LocalTime iso={a.startsAt} /> · 👥 {a.capacity} · {a.visibility}
              </p>
              <p>
                📍 {a.venueName}, {a.areaLabel} — <span className="text-muted">{a.venueAddress}</span>
              </p>
              <p className="text-muted">♿ {a.accessibility}</p>
              <p className="text-xs">Check: public/partner venue? Clear cost & accessibility? Adult audience? Nothing copied that shouldn&apos;t be?</p>
              <form action={opsReview} className="space-y-2">
                <input type="hidden" name="actionId" value={a.id} />
                <label htmlFor={`note-${a.id}`} className="sr-only">
                  Note to host
                </label>
                <input id={`note-${a.id}`} name="note" className="input py-2" placeholder="Note to the host (needed if returning)" />
                <div className="flex gap-2">
                  <SubmitButton name="decision" value="approve" className="btn-mint btn-sm">
                    Approve &amp; publish
                  </SubmitButton>
                  <SubmitButton name="decision" value="return" className="btn-ghost btn-sm">
                    Return with note
                  </SubmitButton>
                </div>
              </form>
            </article>
          );
        })}
      </section>

      <section id="reports" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold">Reports ({reports.length} open)</h2>
        {reports.length === 0 && <p className="text-sm text-muted">No open reports.</p>}
        {reports.map((r) => (
          <article key={r.id} className="card space-y-2 p-5 text-sm">
            <p>
              <b>{r.reason}</b> · {r.targetType}: {describe(r.targetType, r.targetId)}
            </p>
            {r.details && <p className="rounded-xl bg-cream p-2">{r.details}</p>}
            <p className="text-xs text-muted">
              From {userName(db, r.reporterId)} · <LocalTime iso={r.createdAt} mode="short" />
            </p>
            {r.targetType === "message" && (
              <form action={opsRemoveMessage}>
                <input type="hidden" name="messageId" value={r.targetId} />
                <button className="text-xs underline">Remove the message</button>
              </form>
            )}
            <form action={opsResolveReport} className="flex flex-wrap gap-2">
              <input type="hidden" name="reportId" value={r.id} />
              <label htmlFor={`res-${r.id}`} className="sr-only">
                Resolution
              </label>
              <input id={`res-${r.id}`} name="resolution" className="input flex-1 py-2" placeholder="What we did" />
              <SubmitButton name="status" value="resolved" className="btn-mint btn-sm">
                Resolve
              </SubmitButton>
              <SubmitButton name="status" value="dismissed" className="btn-ghost btn-sm">
                Dismiss
              </SubmitButton>
            </form>
          </article>
        ))}
      </section>

      <section id="appeals" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold">Appeals ({appeals.length})</h2>
        {appeals.length === 0 && <p className="text-sm text-muted">No open appeals.</p>}
        {appeals.map((a) => (
          <form key={a.id} action={opsAppeal} className="card space-y-2 p-5 text-sm">
            <p>
              <b>{a.subject}</b> — {userName(db, a.userId)}
            </p>
            <p>{a.details}</p>
            <input type="hidden" name="appealId" value={a.id} />
            <label htmlFor={`resp-${a.id}`} className="sr-only">
              Response
            </label>
            <input id={`resp-${a.id}`} name="response" className="input py-2" placeholder="Response" />
            <div className="flex gap-2">
              <SubmitButton name="status" value="upheld" className="btn-mint btn-sm">
                Uphold
              </SubmitButton>
              <SubmitButton name="status" value="denied" className="btn-ghost btn-sm">
                Deny
              </SubmitButton>
            </div>
          </form>
        ))}
      </section>

      <section id="accounts" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold">Accounts</h2>
        {deletions.map((u) => (
          <form key={u.id} action={opsDeletion} className="card flex flex-wrap items-center justify-between gap-2 bg-blush/30 p-4 text-sm">
            <input type="hidden" name="userId" value={u.id} />
            <span>
              Deletion requested: <b>{u.name}</b> on <LocalTime iso={u.deletionRequestedAt!} mode="short" />
            </span>
            <SubmitButton className="btn-ghost btn-sm">Complete deletion</SubmitButton>
          </form>
        ))}
        <ul className="card divide-y-2 divide-ink/10 text-sm">
          {hosts.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
              <span className="flex-1">
                <b>{u.name}</b> <span className="text-muted">· {u.hostStatus}</span>
              </span>
              <form action={opsHostStatus} className="flex gap-1">
                <input type="hidden" name="userId" value={u.id} />
                {u.hostStatus !== "approved" && (
                  <button name="status" value="approved" className="chip hover:bg-mint">
                    approve
                  </button>
                )}
                {u.hostStatus !== "suspended" && (
                  <button name="status" value="suspended" className="chip hover:bg-blush">
                    pause hosting
                  </button>
                )}
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section id="actions" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold">Actions</h2>
        <p className="text-sm text-muted">Mark actions you prompted, so independent return isn&apos;t overstated.</p>
        <ul className="card divide-y-2 divide-ink/10 text-sm">
          {liveActions.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
              <Link href={`/a/${a.slug}`} className="flex-1 hover:underline">
                <b>{a.title}</b>{" "}
                <span className="text-muted">
                  · {userName(db, a.hostId)} · <LocalTime iso={a.startsAt} mode="short" /> · {a.status}
                  {a.isSample ? " · sample" : ""}
                </span>
              </Link>
              <form action={opsFounderPrompted}>
                <input type="hidden" name="actionId" value={a.id} />
                <button name="value" value={a.founderPrompted ? "no" : "yes"} className={`chip ${a.founderPrompted ? "bg-lilac" : ""}`}>
                  {a.founderPrompted ? "founder-prompted ✓" : "mark founder-prompted"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section id="support" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-bold">Support log</h2>
        <form action={opsLogSupport} className="card flex flex-wrap items-end gap-2 p-4">
          <div>
            <label htmlFor="minutes" className="label">
              Minutes
            </label>
            <input id="minutes" name="minutes" type="number" min={1} max={600} className="input w-24 py-2" required />
          </div>
          <div>
            <label htmlFor="circleId" className="label">
              Circle
            </label>
            <select id="circleId" name="circleId" className="input py-2">
              <option value="">—</option>
              {db.circles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-40 flex-1">
            <label htmlFor="snote" className="label">
              What you did
            </label>
            <input id="snote" name="note" className="input py-2" />
          </div>
          <SubmitButton className="btn-sun btn-sm">Log</SubmitButton>
        </form>
        <ul className="space-y-1 text-sm">
          {[...db.supportLogs].reverse().slice(0, 10).map((s) => (
            <li key={s.id}>
              <b>{s.minutes} min</b> · {s.note} <span className="text-muted">· {s.circleId ? db.circles.find((c) => c.id === s.circleId)?.name : "general"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="audit" className="scroll-mt-20 space-y-2">
        <h2 className="text-xl font-bold">Audit trail</h2>
        <ol className="card max-h-80 divide-y divide-ink/10 overflow-y-auto font-mono text-xs">
          {[...db.audit].reverse().slice(0, 60).map((e) => (
            <li key={e.id} className="px-3 py-1.5">
              <LocalTime iso={e.at} mode="short" /> · {e.actorId === "system" ? "system" : userName(db, e.actorId)} · {e.action} · {e.targetType}:{e.targetId}
            </li>
          ))}
          {db.audit.length === 0 && <li className="px-3 py-2">No events yet.</li>}
        </ol>
      </section>
    </div>
  );
}
