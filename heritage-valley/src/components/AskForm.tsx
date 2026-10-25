"use client";

import Link from "next/link";
import { useState } from "react";
import type { AskRecord } from "@/lib/ask";
import { AnswerView } from "./AnswerView";

export function AskForm() {
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<AskRecord | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Request failed");
      setRecord(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="question" className="block text-sm font-medium text-stone-700">
          Ask a plain-language question
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="What did the last county tourism study say about overnight stays?"
          className="w-full rounded-md border border-stone-300 bg-white p-3 text-base focus:border-valley-600 focus:outline-none"
        />
        <button
          disabled={pending || !question.trim()}
          className="rounded-md bg-valley-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Checking the library…" : "Ask the library"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>
      {record && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-t border-stone-200 pt-4">
            <h2 className="font-serif text-xl font-semibold">{record.question}</h2>
            <Link href={`/brief/${record.id}`} className="text-sm text-valley-700 underline" target="_blank">
              One-page brief
            </Link>
          </div>
          <AnswerView record={record} />
        </div>
      )}
    </div>
  );
}
