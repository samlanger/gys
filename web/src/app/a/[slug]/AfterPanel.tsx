"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { giveFeedback, reportAttendance, thank } from "@/app/actions";
import type { ActionView } from "@/lib/views";
import { SubmitButton } from "@/components/SubmitButton";

const FACES = ["😣", "😕", "🙂", "😊", "🤩"];

export function AfterPanel({ v, members }: { v: ActionView; members: { id: string; name: string }[] }) {
  const [state, action] = useActionState(giveFeedback, null);
  const [worth, setWorth] = useState(4);
  const done = v.viewer.hasFeedback || state?.ok;

  return (
    <section className="space-y-4" aria-label="After the gathering">
      {v.viewer.attendance === "unknown" && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="font-bold">Did you make it?</p>
          <form action={reportAttendance} className="flex gap-2">
            <input type="hidden" name="actionId" value={v.id} />
            <input type="hidden" name="slug" value={v.slug} />
            <button name="attended" value="yes" className="btn-mint btn-sm">
              Yes, I was there
            </button>
            <button name="attended" value="no" className="btn-ghost btn-sm">
              Couldn&apos;t go
            </button>
          </form>
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-xl font-bold">How was it? 💬</h2>
        <p className="text-sm text-muted">
          Private. Hosts only ever see totals, and only once at least five people have answered. Your note is never shown to them.
        </p>
        {done ? (
          <p className="mt-4 rounded-2xl bg-mint/30 p-4 font-semibold">Thank you — that really helps 💛 {state?.ok ? "" : "(You can update it below.)"}</p>
        ) : null}
        <form action={action} className="mt-4 space-y-4">
          <input type="hidden" name="actionId" value={v.id} />
          <fieldset>
            <legend className="label">Was it worth doing?</legend>
            <div className="flex justify-between gap-1">
              {FACES.map((f, i) => (
                <label key={f} className={`flex-1 cursor-pointer rounded-2xl border-2 py-2 text-center text-3xl transition ${worth === i + 1 ? "scale-110 border-ink bg-sun" : "border-transparent"}`}>
                  <input type="radio" className="sr-only" name="worthIt" value={i + 1} checked={worth === i + 1} onChange={() => setWorth(i + 1)} />
                  <span aria-hidden>{f}</span>
                  <span className="sr-only">{i + 1} out of 5</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <fieldset>
              <legend className="label">Felt welcome?</legend>
              <select name="feltWelcome" className="input" defaultValue="yes">
                <option value="yes">Yes</option>
                <option value="no">Not really</option>
              </select>
            </fieldset>
            <fieldset>
              <legend className="label">Come again?</legend>
              <select name="wouldReturn" className="input" defaultValue="yes">
                <option value="yes">I&apos;d love to</option>
                <option value="no">Probably not</option>
              </select>
            </fieldset>
          </div>
          <div>
            <label className="label" htmlFor="privateNote">
              Anything we should know? (private)
            </label>
            <textarea id="privateNote" name="privateNote" className="input" rows={2} placeholder="Only the pilot team can read this." />
          </div>
          {state && !state.ok && (
            <p role="alert" className="rounded-xl bg-blush p-3 text-sm">
              {state.error}
            </p>
          )}
          <SubmitButton className="btn-primary w-full">{done ? "Update" : "Send privately"}</SubmitButton>
        </form>
      </div>

      {members.length > 0 && (
        <form action={thank} className="card space-y-3 bg-blush/30 p-5">
          <h2 className="text-xl font-bold">Thank someone 💌</h2>
          <p className="text-sm text-muted">Specific is lovely: “Thanks for the spare scissors” beats “great job”.</p>
          <input type="hidden" name="actionId" value={v.id} />
          <input type="hidden" name="back" value={`/a/${v.slug}`} />
          <label className="sr-only" htmlFor="toId">
            Who
          </label>
          <select id="toId" name="toId" className="input" required>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="message">
            Message
          </label>
          <input id="message" name="message" className="input" placeholder="Thanks for…" required minLength={3} maxLength={200} />
          <SubmitButton className="btn-ghost">Send thanks</SubmitButton>
        </form>
      )}

      {v.circle && (
        <Link href={`/c/${v.circle.id}`} className="card flex items-center gap-3 bg-sun/40 p-5">
          <span className="text-4xl" aria-hidden>
            {v.circle.emoji}
          </span>
          <span className="flex-1">
            <b>Do it again?</b>
            <span className="block text-sm">Head to {v.circle.name} to pick the next date together.</span>
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}
    </section>
  );
}
