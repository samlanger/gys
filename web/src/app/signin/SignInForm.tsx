"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

export function SignInForm({ next, demo }: { next: string; demo: boolean }) {
  const [state, action] = useActionState(signIn, null);
  return (
    <form action={action} className="card space-y-4 p-6">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="name" className="label">
          Your first name
        </label>
        <input id="name" name="name" className="input" autoComplete="given-name" required maxLength={40} placeholder="e.g. Sam" />
        <p className="hint">This is what people in your group will see.</p>
      </div>
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required placeholder="you@example.com" />
        <p className="hint">Never shown to other people. Used for reminders you can turn off.</p>
      </div>
      <label className="flex items-start gap-3 rounded-2xl bg-cream p-3 text-sm">
        <input type="checkbox" name="adult" className="mt-1 h-5 w-5 accent-tomato" required />
        <span>I&apos;m 18 or over. (The pilot is for adults for now.)</span>
      </label>
      {state && !state.ok && (
        <p role="alert" className="rounded-xl bg-blush p-3 text-sm font-semibold">
          {state.error}
        </p>
      )}
      <SubmitButton className="btn-primary w-full">Continue</SubmitButton>
      <p className="text-center text-xs text-muted">
        {demo
          ? "Demo: no email is sent — you're signed in straight away. The live version sends a one-time sign-in link."
          : "We'll email you a one-time sign-in link."}
      </p>
    </form>
  );
}
