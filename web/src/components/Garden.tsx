/**
 * The Circle's shared garden: one plant per gathering that happened.
 * Height grows with the number of people, flowers bloom for each role someone
 * took, and sparkles appear for each thank-you. No scores, no streaks.
 */

const INK = "#2a1f17";
const PETALS = ["#ff6847", "#ffc93c", "#b49cff", "#ffb5c2", "#66c2ff"];

export interface GardenPlot {
  actionId: string;
  title: string;
  date: string;
  people: number;
  roles: number;
  thanks: number;
}

export function Garden({ plots, upcoming = false, compact = false }: { plots: GardenPlot[]; upcoming?: boolean; compact?: boolean }) {
  const slots = Math.max(plots.length + (upcoming ? 1 : 0), 3);
  const w = Math.max(slots * 70, 240);
  const h = compact ? 120 : 160;
  const ground = h - 24;
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Circle garden with ${plots.length} plant${plots.length === 1 ? "" : "s"}, one for each gathering`}>
        <defs>
          <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#e3f2ff" />
            <stop offset="1" stopColor="#fff7ec" />
          </linearGradient>
        </defs>
        <rect width={w} height={h} rx="20" fill="url(#sky)" />
        <circle cx={w - 34} cy="30" r="16" fill="#ffc93c" stroke={INK} strokeWidth="2.5" />
        <path d={`M0 ${ground} Q ${w / 4} ${ground - 10} ${w / 2} ${ground} T ${w} ${ground} V ${h} H 0 Z`} fill="#4fc59f" stroke={INK} strokeWidth="2.5" />
        {plots.map((p, i) => {
          const x = 40 + i * ((w - 60) / Math.max(slots - 1, 1));
          const stem = Math.min(28 + p.people * 7, ground - 30);
          const top = ground - stem;
          return (
            <g key={p.actionId} className="origin-bottom animate-grow" style={{ transformBox: "fill-box", animationDelay: `${i * 0.12}s` }}>
              <title>{`${p.title}: ${p.people} people, ${p.roles} roles taken, ${p.thanks} thank-yous`}</title>
              <path d={`M${x} ${ground} C ${x - 4} ${ground - stem / 2}, ${x + 4} ${ground - stem / 2}, ${x} ${top}`} stroke={INK} strokeWidth="3" fill="none" />
              <path d={`M${x} ${ground - stem / 3} c -14 -2 -18 -12 -16 -16 c 10 0 16 6 16 16 z`} fill="#8ee0b8" stroke={INK} strokeWidth="2" />
              <path d={`M${x} ${ground - stem / 2} c 14 -2 18 -12 16 -16 c -10 0 -16 6 -16 16 z`} fill="#8ee0b8" stroke={INK} strokeWidth="2" />
              {Array.from({ length: Math.max(1, Math.min(p.roles + 1, 6)) }).map((_, j, arr) => {
                const a = (j / arr.length) * Math.PI * 2;
                const r = arr.length === 1 ? 0 : 9;
                return <circle key={j} cx={x + Math.cos(a) * r} cy={top + Math.sin(a) * r} r="7" fill={PETALS[(i + j) % PETALS.length]} stroke={INK} strokeWidth="2" />;
              })}
              <circle cx={x} cy={top} r="4.5" fill="#ffc93c" stroke={INK} strokeWidth="2" />
              {Array.from({ length: Math.min(p.thanks, 4) }).map((_, j) => (
                <text key={j} x={x + 14 + j * 7} y={top - 10 - (j % 2) * 8} fontSize="10">
                  ✦
                </text>
              ))}
            </g>
          );
        })}
        {upcoming && (
          <g>
            <title>The next gathering — a seed waiting to sprout</title>
            {(() => {
              const x = 40 + plots.length * ((w - 60) / Math.max(slots - 1, 1));
              return (
                <>
                  <ellipse cx={x} cy={ground + 2} rx="9" ry="5" fill="#8a5a3b" stroke={INK} strokeWidth="2" />
                  <path d={`M${x} ${ground} v -10`} stroke={INK} strokeWidth="2.5" />
                  <path d={`M${x} ${ground - 8} c -8 0 -10 -6 -9 -9 c 6 0 9 4 9 9 z`} fill="#8ee0b8" stroke={INK} strokeWidth="2" className="animate-float" style={{ transformBox: "fill-box" }} />
                </>
              );
            })()}
          </g>
        )}
      </svg>
      {!compact && (
        <figcaption className="mt-2 text-center text-xs text-muted">
          A plant for every gathering · flowers for roles people took · ✦ for thank-yous
        </figcaption>
      )}
    </figure>
  );
}
