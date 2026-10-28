"use client";

import { useActionState, useState } from "react";
import { join, leave, pickRole } from "@/app/actions";
import type { ActionView } from "@/lib/views";
import { SubmitButton } from "@/components/SubmitButton";

function Stamp({ text, tone }: { text: string; tone: "mint" | "sun" }) {
  return (
    <span
      className={`inline-block animate-stamp rounded-xl border-4 px-3 py-1 font-display text-2xl font-bold uppercase ${tone === "mint" ? "border-mint text-mint" : "border-sun text-[#b98500]"}`}
    >
      {text}
    </span>
  );
}

function RolePicker({ v, name = "roleSlotId", allowNone = true }: { v: ActionView; name?: string; allowNone?: boolean }) {
  const [sel, setSel] = useState(v.viewer.roleSlotId ?? "");
  return (
    <fieldset className="space-y-2">
      <legend className="label">Fancy a small job? (totally optional)</legend>
      {allowNone && (
        <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 ${sel === "" ? "border-ink bg-sun/30" : "border-ink/20"}`}>
          <input type="radio" name={name} value="" checked={sel === ""} onChange={() => setSel("")} className="accent-tomato" />
          <span className="text-2xl" aria-hidden>
            🙂
          </span>
          <span>
            <b>Just come along</b>
            <span className="block text-sm text-muted">Showing up is plenty.</span>
          </span>
        </label>
      )}
      {v.roles.map((r) => {
        const full = r.taken >= r.capacity && !r.mine;
        return (
          <label
            key={r.id}
            className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${full ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${sel === r.id ? "border-ink bg-sun/30" : "border-ink/20"}`}
          >
            <input type="radio" name={name} value={r.id} disabled={full} checked={sel === r.id} onChange={() => setSel(r.id)} className="accent-tomato" />
            <span className="text-2xl" aria-hidden>
              {r.emoji}
            </span>
            <span className="flex-1">
              <b>{r.name}</b>
              <span className="block text-sm text-muted">{r.description}</span>
            </span>
            <span className="text-xs font-bold text-muted">{full ? "taken" : `${r.capacity - r.taken} open`}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function JoinPanel({
  v,
  invite,
  campaign,
  channel,
  justJoined,
  autojoin,
}: {
  v: ActionView;
  invite?: string;
  campaign?: string;
  channel?: string;
  justJoined?: "confirmed" | "waitlisted";
  autojoin: boolean;
  endIso: string;
}) {
  const [state, action] = useActionState(join, null);
  const [modal, setModal] = useState(!!justJoined);
  const status = v.viewer.rsvpStatus;
  const myRole = v.roles.find((r) => r.id === v.viewer.roleSlotId);

  if (v.viewer.isHost) {
    return (
      <section className="card bg-sun/30 p-5">
        <p className="font-semibold">You&apos;re hosting this one 🧑‍🍳</p>
        <p className="text-sm text-muted">Share it, assign roles and see who&apos;s coming from your host page.</p>
      </section>
    );
  }

  if (status === "confirmed") {
    return (
      <>
        {modal && justJoined && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="joined-title">
            <div className="card w-full max-w-md animate-pop p-6 text-center">
              <Stamp text="You're in!" tone="mint" />
              <h2 id="joined-title" className="mt-4 text-2xl font-bold">
                See you there 🎉
              </h2>
              <p className="mt-1 text-muted">Your place is saved. The exact address is below — just for people who are coming.</p>
              <div className="mt-5 grid gap-2">
                <a href={`/api/ics/${v.slug}`} className="btn-primary">
                  📅 Add to my calendar
                </a>
                <button className="btn-ghost" onClick={() => setModal(false)}>
                  {v.roles.length && !myRole ? "Pick a small role" : "Done"}
                </button>
              </div>
            </div>
          </div>
        )}
        <section className="card overflow-hidden" aria-labelledby="yourplace">
          <div className="flex items-center justify-between gap-3 bg-mint/30 p-5">
            <div>
              <h2 id="yourplace" className="text-xl font-bold">
                Your place is confirmed
              </h2>
              <p className="text-sm">{myRole ? `You're on ${myRole.emoji} ${myRole.name} — thank you!` : "You're coming along."}</p>
            </div>
            <Stamp text="In!" tone="mint" />
          </div>
          {v.private && (
            <div className="border-t-2 border-ink p-5">
              <p className="label">📍 Exact place (only for people coming)</p>
              <p className="font-semibold">{v.venueName}</p>
              <p>{v.private.venueAddress}</p>
              {v.private.venueNotes && <p className="mt-2 rounded-xl bg-cream p-3 text-sm">{v.private.venueNotes}</p>}
              <a href={`/api/ics/${v.slug}`} className="btn-ghost btn-sm mt-4">
                📅 Add to calendar
              </a>
              {v.circle && (
                <a href={`/c/${v.circle.id}`} className="btn-ghost btn-sm ml-2 mt-4">
                  {v.circle.emoji} Say hi in the Circle
                </a>
              )}
            </div>
          )}
          {v.roles.length > 0 && (
            <form action={pickRole} className="space-y-3 border-t-2 border-ink p-5">
              <input type="hidden" name="actionId" value={v.id} />
              <input type="hidden" name="slug" value={v.slug} />
              <RolePicker v={v} />
              <SubmitButton className="btn-sun btn-sm">Save my role</SubmitButton>
            </form>
          )}
          <form
            action={leave}
            className="border-t-2 border-dashed border-ink/30 p-5"
            onSubmit={(e) => {
              if (!confirm("Give up your place? Someone on the waitlist will get it.")) e.preventDefault();
            }}
          >
            <input type="hidden" name="actionId" value={v.id} />
            <input type="hidden" name="slug" value={v.slug} />
            <button className="text-sm text-muted underline">I can&apos;t make it any more</button>
          </form>
        </section>
      </>
    );
  }

  if (status === "waitlisted") {
    return (
      <section className="card p-5">
        {justJoined && <Stamp text="On the list" tone="sun" />}
        <h2 className="mt-2 text-xl font-bold">You&apos;re #{v.viewer.waitlistPosition} on the waitlist</h2>
        <p className="text-sm text-muted">If a place opens up, you get it automatically and we&apos;ll let you know. The exact address is shared once you&apos;re confirmed.</p>
        <form action={leave} className="mt-3">
          <input type="hidden" name="actionId" value={v.id} />
          <input type="hidden" name="slug" value={v.slug} />
          <button className="text-sm underline">Leave the waitlist</button>
        </form>
      </section>
    );
  }

  const full = v.spotsLeft === 0;
  return (
    <section className={`card p-5 ${autojoin ? "ring-4 ring-sun" : ""}`} aria-labelledby="join-title">
      <h2 id="join-title" className="text-xl font-bold">
        {autojoin ? "Nearly there — confirm your place" : full ? "It's full — join the waitlist?" : "Want to come?"}
      </h2>
      <p className="mb-4 text-sm text-muted">
        {full
          ? "Places go to the waitlist in order, automatically."
          : v.viewer.signedIn
            ? "One tap and you're in. You can change your mind any time."
            : "Takes 20 seconds: your name and email. No app, no social login."}
      </p>
      <form action={action} className="space-y-4">
        <input type="hidden" name="actionId" value={v.id} />
        <input type="hidden" name="slug" value={v.slug} />
        {invite && <input type="hidden" name="i" value={invite} />}
        {campaign && <input type="hidden" name="c" value={campaign} />}
        {channel && <input type="hidden" name="ch" value={channel} />}
        {v.viewer.signedIn && !full && v.roles.length > 0 && <RolePicker v={v} />}
        {state && !state.ok && (
          <p role="alert" className="rounded-xl bg-blush p-3 text-sm font-semibold">
            {state.error}
          </p>
        )}
        <SubmitButton className="btn-primary w-full text-lg" pendingText="Saving your place…">
          {full ? "Join the waitlist" : "Join this ✋"}
        </SubmitButton>
      </form>
    </section>
  );
}
