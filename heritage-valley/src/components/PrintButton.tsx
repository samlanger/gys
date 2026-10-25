"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="no-print rounded-md border border-stone-300 px-3 py-1.5 text-sm">
      Print or save as PDF
    </button>
  );
}
