"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExtractForm({ documents }: { documents: { id: number; title: string }[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/policy/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: Number(data.get("documentId")), topic: data.get("topic") }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setMessage(
        `Added ${body.inserted} rule${body.inserted === 1 ? "" : "s"}.` +
          (body.rejected.length ? ` ${body.rejected.length} dropped because their quotes could not be verified.` : "") +
          (body.inserted === 0 && !body.rejected.length ? " No passages on that topic in this document." : ""),
      );
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm">
      <label className="min-w-60 flex-1">
        Document
        <select name="documentId" required className="w-full rounded border border-stone-300 bg-white px-2 py-1.5">
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-60 flex-1">
        Pilot topic
        <input
          name="topic"
          required
          placeholder="agritourism: farm stays, farm dinners, u-pick"
          className="w-full rounded border border-stone-300 bg-white px-2 py-1.5"
        />
      </label>
      <button disabled={pending} className="rounded-md bg-valley-700 px-4 py-2 font-medium text-white disabled:opacity-50">
        {pending ? "Reading rules…" : "Extract rules"}
      </button>
      {message && <p className="w-full text-stone-700">{message}</p>}
    </form>
  );
}

export function ReviewButton({ id }: { id: number }) {
  const router = useRouter();
  async function review() {
    const reviewer = window.prompt("Name of the counsel who reviewed this entry:");
    if (!reviewer?.trim()) return;
    const res = await fetch(`/api/policy/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewer }),
    });
    if (res.ok) router.refresh();
  }
  return (
    <button onClick={review} className="text-xs text-valley-700 underline">
      Record counsel review
    </button>
  );
}
