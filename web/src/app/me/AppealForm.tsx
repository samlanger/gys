"use client";

import { useActionState } from "react";
import { appeal } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

export function AppealForm() {
  const [state, action] = useActionState(appeal, null);
  return (
    <details className="card p-5">
      <summary className="cursor-pointer font-bold">Disagree with a decision? Appeal</summary>
      <form action={action} className="mt-3 space-y-2">
        <label htmlFor="subject" className="label">
          What&apos;s it about?
        </label>
        <input id="subject" name="subject" className="input" maxLength={120} required />
        <label htmlFor="details" className="label">
          Tell us more
        </label>
        <textarea id="details" name="details" className="input" rows={3} maxLength={2000} />
        {state && <p className={`rounded-xl p-3 text-sm ${state.ok ? "bg-mint/40" : "bg-blush"}`}>{state.ok ? state.message : state.error}</p>}
        <SubmitButton className="btn-ghost btn-sm">Send appeal</SubmitButton>
        <p className="text-xs text-muted">A person reviews every appeal.</p>
      </form>
    </details>
  );
}
