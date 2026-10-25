"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, DOC_TYPES } from "@/lib/library";

const input = "w-full rounded border border-stone-300 bg-white px-2 py-1.5";

export function UploadForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: new FormData(form) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setMessage(
        body.duplicate
          ? "This file is already in the library."
          : `Added: ${body.pageCount} pages, ${body.passageCount} passages.` +
              (body.pagesWithoutText.length
                ? ` Pages with no text layer (need OCR): ${body.pagesWithoutText.join(", ")}.`
                : ""),
      );
      form.reset();
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm sm:grid-cols-2">
      <label className="sm:col-span-2">
        PDF file
        <input name="file" type="file" accept="application/pdf" required className={input} />
      </label>
      <label className="sm:col-span-2">
        Title
        <input name="title" required className={input} placeholder="Ventura County General Plan — Agriculture Element" />
      </label>
      <label>
        Category
        <select name="category" required className={input}>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Type
        <select name="docType" required className={input}>
          {DOC_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        Geography (comma-separated)
        <input name="geography" className={input} placeholder="Fillmore, Piru" />
      </label>
      <label>
        Topics (comma-separated)
        <input name="topics" className={input} placeholder="agritourism, lodging" />
      </label>
      <label>
        Published date
        <input name="publishedDate" type="date" className={input} />
      </label>
      <label>
        Last verified
        <input name="lastVerified" type="date" className={input} />
      </label>
      <label>
        Owner
        <input name="owner" required className={input} placeholder="Who supplied this document" />
      </label>
      <label>
        Source URL
        <input name="sourceUrl" type="url" className={input} />
      </label>
      <label className="flex items-center gap-2 sm:col-span-2">
        <input name="copyrighted" type="checkbox" /> Copyrighted work (cite by page and short quote; never display in full)
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="rounded-md bg-valley-700 px-4 py-2 font-medium text-white disabled:opacity-50">
          {pending ? "Reading pages…" : "Add to library"}
        </button>
        {message && <p className="text-stone-700">{message}</p>}
      </div>
    </form>
  );
}
