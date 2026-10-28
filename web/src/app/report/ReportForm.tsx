"use client";

import { useActionState } from "react";
import { report } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

const REASONS = ["Made me feel unsafe", "Harassment or unkind behaviour", "Misleading details", "Spam or selling", "Venue isn't public/accessible as described", "Something else"];

export function ReportForm({ targetType, targetId }: { targetType: string; targetId: string }) {
  const [state, action] = useActionState(report, null);
  if (state?.ok) return <p className="card bg-mint/30 p-5 font-semibold">{state.message}</p>;
  return (
    <form action={action} className="card space-y-3 p-5">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <fieldset className="space-y-2">
        <legend className="label">What&apos;s wrong?</legend>
        {REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2">
            <input type="radio" name="reason" value={r} required className="accent-tomato" /> {r}
          </label>
        ))}
      </fieldset>
      <label htmlFor="details" className="label">
        Details (optional)
      </label>
      <textarea id="details" name="details" rows={4} className="input" maxLength={2000} />
      {state && !state.ok && <p className="rounded-xl bg-blush p-3 text-sm">{state.error}</p>}
      <SubmitButton className="btn-primary w-full">Send report</SubmitButton>
    </form>
  );
}
