"use client";

import { useState } from "react";

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, next }),
    });
    if (res.ok) setSent(true);
    else setError((await res.json()).error ?? "Something went wrong");
  }

  if (sent) {
    return <p className="rounded bg-valley-50 p-3 text-sm">If {email} is on the pilot team, a sign-in link is on its way.</p>;
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@county.gov"
        className="w-full rounded-md border border-stone-300 bg-white p-2"
      />
      <button className="w-full rounded-md bg-valley-700 px-4 py-2 font-medium text-white">Email me a link</button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
