import Link from "next/link";
import type { ActionCardData } from "@/lib/views";
import { Doodle } from "./Doodle";
import { LocalTime } from "./LocalTime";

export function SampleTag() {
  return (
    <span className="rounded-full border border-dashed border-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
      Sample
    </span>
  );
}

export function SpotsBadge({ spotsLeft, status }: { spotsLeft: number; status: string }) {
  if (status === "cancelled") return <span className="chip bg-blush">Cancelled</span>;
  if (status === "completed") return <span className="chip bg-mint">Happened ✓</span>;
  if (status === "draft") return <span className="chip bg-cream">Draft</span>;
  if (status === "in_review") return <span className="chip bg-lilac">In review</span>;
  if (spotsLeft === 0) return <span className="chip bg-sun">Full · waitlist open</span>;
  if (spotsLeft <= 2) return <span className="chip bg-tomato text-white">{spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left!</span>;
  return <span className="chip bg-mint">{spotsLeft} spots open</span>;
}

/** A ticket-style invitation card. */
export function ActionCard({ a, href }: { a: ActionCardData; href?: string }) {
  return (
    <Link
      href={href ?? `/a/${a.slug}`}
      className="card group relative flex gap-4 overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-sticker-lg"
    >
      <div className="shrink-0 transition group-hover:animate-wiggle">
        <Doodle category={a.category} className="h-20 w-20" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <SpotsBadge spotsLeft={a.spotsLeft} status={a.status} />
          {a.isSample && <SampleTag />}
        </div>
        <h3 className="truncate text-lg font-bold leading-tight">{a.title}</h3>
        <p className="text-sm text-muted">
          <LocalTime iso={a.startsAt} /> · {a.areaLabel || "Place TBC"}
        </p>
        <p className="mt-1 text-sm">
          Hosted by <b>{a.hostName}</b> · {a.costLabel}
        </p>
      </div>
      {/* ticket notches */}
      <span aria-hidden className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-ink bg-cream" />
    </Link>
  );
}
