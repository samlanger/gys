"use client";

const fmt = (iso: string, mode: "full" | "date" | "time" | "short") => {
  const d = new Date(iso);
  if (mode === "time") return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (mode === "date") return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  if (mode === "short") return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

/** Renders in the viewer's own timezone. */
export function LocalTime({ iso, mode = "full" }: { iso: string; mode?: "full" | "date" | "time" | "short" }) {
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {fmt(iso, mode)}
    </time>
  );
}

export function Countdown({ iso }: { iso: string }) {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  const text = days < 0 ? `${-days} days ago` : days === 0 ? "today!" : days === 1 ? "tomorrow" : `in ${days} days`;
  return <span suppressHydrationWarning>{text}</span>;
}
