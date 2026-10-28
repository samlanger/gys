"use client";

import { useEffect, useState } from "react";

/** Shows the one-time message set by a server action, then clears it. */
export function Flash() {
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  useEffect(() => {
    const read = () => {
      const raw = document.cookie.split("; ").find((c) => c.startsWith("hd_flash="));
      if (!raw) return;
      document.cookie = "hd_flash=; Max-Age=0; path=/";
      try {
        setMsg(JSON.parse(decodeURIComponent(raw.slice(9))));
      } catch {
        /* ignore */
      }
    };
    read();
    const id = setInterval(read, 600);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4500);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4" role="status" aria-live="polite">
      <button
        onClick={() => setMsg(null)}
        className={`pointer-events-auto animate-pop rounded-2xl border-2 border-ink px-4 py-3 text-left font-semibold shadow-sticker-lg ${msg.tone === "error" ? "bg-blush" : "bg-sun"}`}
      >
        {msg.tone === "error" ? "😬 " : "✨ "}
        {msg.text}
      </button>
    </div>
  );
}
