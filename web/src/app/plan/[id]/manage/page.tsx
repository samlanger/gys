import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { load } from "@/lib/session-data";
import { canManageAction } from "@/lib/domain/access";
import { feedbackAggregate, FEEDBACK_AGGREGATE_MIN } from "@/lib/domain/circles";
import { SHARE_STATUS_LABEL } from "@/lib/domain/share";
import { APP_URL } from "@/lib/config";
import { assignRole, cancelPlan, makeInvite, revokeInvite } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { LocalTime, Countdown } from "@/components/LocalTime";
import { SpotsBadge } from "@/components/ActionCard";
import { SubmitButton } from "@/components/SubmitButton";
import { CopyButton } from "@/components/CopyButton";

export const metadata = { title: "Manage plan" };

export default async function Manage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, ctx, user } = await load();
  if (!user) redirect(`/signin?next=/plan/${id}/manage`);
  const a = db.actions.find((x) => x.id === id);
  if (!a) notFound();
  if (!canManageAction(db, a, ctx.userId) && !user.isOperator) return <p className="card p-6">Only the host can manage this plan.</p>;

  const rsvps = db.rsvps.filter((r) => r.actionId === a.id);
  const confirmed = rsvps.filter((r) => r.status === "confirmed").sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  const waitlist = rsvps.filter((r) => r.status === "waitlisted").sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  const name = (uid: string) => db.users.find((u) => u.id === uid)?.name ?? "Someone";
  const started = new Date(a.startsAt).getTime() <= ctx.now.getTime();
  const invites = db.invitations.filter((i) => i.actionId === a.id).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const agg = a.status === "completed" || started ? feedbackAggregate(db, ctx, a.id) : null;
  const events = db.campaignEvents.filter((e) => e.actionId === a.id);
  const byKind = (k: keyof typeof SHARE_STATUS_LABEL) => events.filter((e) => e.kind === k).length;
  const unattributed = confirmed.filter((r) => !r.campaignCode).length;
  const live = a.status === "published";

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <SpotsBadge spotsLeft={Math.max(0, a.capacity - confirmed.length)} status={a.status} />
          {a.visibility === "invite" && <span className="chip bg-lilac">💌 Invite-only</span>}
        </div>
        <h1 className="text-3xl font-bold">{a.title}</h1>
        <p className="text-muted">
          <LocalTime iso={a.startsAt} /> · <Countdown iso={a.startsAt} />
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href={`/a/${a.slug}`} className="btn-ghost btn-sm">
            👀 View page
          </Link>
          {(a.status === "draft" || live) && (
            <Link href={`/plan/${a.id}/edit`} className="btn-ghost btn-sm">
              ✏️ Edit
            </Link>
          )}
          {live && (
            <Link href={`/plan/${a.id}/share`} className="btn-sun btn-sm">
              📣 Share kit
            </Link>
          )}
          {(live || a.status === "completed") && started && (
            <Link href={`/plan/${a.id}/wrap`} className="btn-mint btn-sm">
              🌱 Wrap up &amp; plan next
            </Link>
          )}
        </div>
      </header>

      {a.status === "in_review" && (
        <div className="card bg-lilac/30 p-5">
          <p className="text-lg font-bold">⏳ With the pilot team</p>
          <p className="text-sm">A real person is checking your first plan — that the venue is public or a partner space, and the details are clear. You&apos;ll get a notification.</p>
        </div>
      )}

      <section className="card p-5" aria-labelledby="coming">
        <h2 id="coming" className="text-lg font-bold">
          Who&apos;s coming ({confirmed.length}/{a.capacity})
        </h2>
        {confirmed.length === 0 && <p className="mt-2 text-sm text-muted">No one yet — sharing is the magic step ✨</p>}
        <ul className="mt-3 divide-y-2 divide-ink/10">
          {confirmed.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={name(r.userId)} />
              <span className="min-w-24 flex-1">
                <b>{name(r.userId)}</b>
                <span className="block text-xs text-muted">
                  {r.promotedAt ? "from waitlist · " : ""}
                  {r.campaignCode ? `via ${r.channel ?? "link"}` : "direct"}
                </span>
              </span>
              {a.roles.length > 0 && live && (
                <form action={assignRole} className="flex items-center gap-2">
                  <input type="hidden" name="rsvpId" value={r.id} />
                  <input type="hidden" name="actionId" value={a.id} />
                  <label className="sr-only" htmlFor={`role-${r.id}`}>
                    Role for {name(r.userId)}
                  </label>
                  <select id={`role-${r.id}`} name="roleSlotId" defaultValue={r.roleSlotId ?? ""} className="input w-auto py-1.5 text-sm">
                    <option value="">No role</option>
                    {a.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.emoji} {role.name}
                      </option>
                    ))}
                  </select>
                  <SubmitButton className="btn-ghost btn-sm" pendingText="…">
                    Set
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
        {waitlist.length > 0 && (
          <>
            <h3 className="mt-4 font-bold">Waitlist</h3>
            <ol className="mt-1 list-inside list-decimal text-sm">
              {waitlist.map((r) => (
                <li key={r.id}>{name(r.userId)}</li>
              ))}
            </ol>
            <p className="text-xs text-muted">When someone drops out, the next person gets their place automatically.</p>
          </>
        )}
        {a.roles.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {a.roles.map((role) => {
              const taken = confirmed.filter((r) => r.roleSlotId === role.id).length;
              return (
                <span key={role.id} className={`chip ${taken >= role.capacity ? "bg-mint" : ""}`}>
                  {role.emoji} {role.name} {taken}/{role.capacity}
                </span>
              );
            })}
          </div>
        )}
      </section>

      {(live || a.status === "draft") && (
        <section className="card space-y-3 p-5" aria-labelledby="inv">
          <h2 id="inv" className="text-lg font-bold">
            💌 Invitation links
          </h2>
          <p className="text-sm text-muted">
            {a.visibility === "invite" ? "This plan is invite-only, so people need one of these links." : "Optional for public plans — handy for a group chat."} Links expire.
          </p>
          {live && (
            <form action={makeInvite} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="actionId" value={a.id} />
              <div>
                <label className="label" htmlFor="days">
                  Expires after
                </label>
                <select id="days" name="days" className="input py-2" defaultValue="7">
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="maxUses">
                  Max people
                </label>
                <input id="maxUses" name="maxUses" type="number" min={1} max={100} defaultValue={10} className="input w-24 py-2" />
              </div>
              <SubmitButton className="btn-sun btn-sm">New link</SubmitButton>
            </form>
          )}
          <ul className="space-y-2">
            {invites.map((i) => {
              const expired = new Date(i.expiresAt).getTime() <= ctx.now.getTime();
              const state = i.revokedAt ? "turned off" : expired ? "expired" : i.uses >= i.maxUses ? "used up" : "active";
              const url = `${APP_URL}/a/${a.slug}?i=${i.token}`;
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-cream p-3 text-sm">
                  <span className={`chip ${state === "active" ? "bg-mint" : "bg-cream"}`}>{state}</span>
                  <span className="flex-1 text-xs text-muted">
                    {i.uses}/{i.maxUses} used · until <LocalTime iso={i.expiresAt} mode="short" />
                  </span>
                  {state === "active" && (
                    <>
                      <CopyButton text={url} label="Copy link" />
                      <form action={revokeInvite}>
                        <input type="hidden" name="invitationId" value={i.id} />
                        <input type="hidden" name="actionId" value={a.id} />
                        <button className="text-xs underline">Turn off</button>
                      </form>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {agg && (
        <section className="card p-5" aria-labelledby="fb">
          <h2 id="fb" className="text-lg font-bold">
            💬 How it went (private feedback)
          </h2>
          {agg.visible ? (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-sun/40 p-3">
                <p className="font-display text-3xl font-bold">{agg.avgWorthIt}</p>
                <p className="text-xs">worth it (of 5)</p>
              </div>
              <div className="rounded-2xl bg-mint/40 p-3">
                <p className="font-display text-3xl font-bold">{agg.wouldReturnPct}%</p>
                <p className="text-xs">want to return</p>
              </div>
              <div className="rounded-2xl bg-sky/40 p-3">
                <p className="font-display text-3xl font-bold">{agg.feltWelcomePct}%</p>
                <p className="text-xs">felt welcome</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              {agg.responses} response{agg.responses === 1 ? "" : "s"} so far. To protect people&apos;s privacy, totals appear once at least {FEEDBACK_AGGREGATE_MIN} people have answered.
            </p>
          )}
          <p className="mt-2 text-xs text-muted">Individual answers and notes are never shown to hosts. Based on {agg.responses} responses from {confirmed.length} people.</p>
        </section>
      )}

      {a.status !== "draft" && a.status !== "in_review" && (
        <section className="card p-5 text-sm" aria-labelledby="reach">
          <h2 id="reach" className="text-lg font-bold">
            📈 Reach
          </h2>
          <ul className="mt-2 space-y-1">
            <li>
              {byKind("visit")} visits from your share links · {byKind("join")} joined from a link
            </li>
            <li>
              {unattributed} of {confirmed.length} joined without a link code — <i>we don&apos;t know how they found it</i>
            </li>
            <li className="text-muted">
              {byKind("share_opened") + byKind("image_downloaded") + byKind("caption_copied") + byKind("link_copied")} share actions started. We can&apos;t see
              whether anything was actually posted.
            </li>
          </ul>
        </section>
      )}

      {(live || a.status === "draft") && (
        <details className="card p-5">
          <summary className="cursor-pointer font-bold">Need to cancel?</summary>
          <form action={cancelPlan} className="mt-3 space-y-2">
            <input type="hidden" name="actionId" value={a.id} />
            <label className="label" htmlFor="reason">
              A short note for everyone
            </label>
            <input id="reason" name="reason" className="input" placeholder="Sorry — the venue is closed that day." maxLength={300} />
            <SubmitButton className="btn-ghost btn-sm">Cancel this plan</SubmitButton>
          </form>
        </details>
      )}
    </div>
  );
}
