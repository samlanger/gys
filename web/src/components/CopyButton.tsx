"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy", onCopied, className = "btn-ghost btn-sm" }: { text: string; label?: string; onCopied?: () => void; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Clipboard blocked: fall back to a prompt the user can copy from.
          window.prompt("Copy this:", text);
        }
        setDone(true);
        onCopied?.();
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}
