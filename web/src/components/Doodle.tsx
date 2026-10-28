/** Hand-drawn-ish category illustrations. Pure SVG, no external media. */

const INK = "#2a1f17";

function Repair() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="22" y="38" width="76" height="52" rx="12" fill="#66c2ff" stroke={INK} strokeWidth="4" />
      <path d="M30 52 h60 M30 66 h60 M30 80 h60" stroke="#fff" strokeWidth="3" strokeDasharray="4 6" opacity=".7" />
      <rect x="44" y="50" width="30" height="26" rx="5" fill="#ffc93c" stroke={INK} strokeWidth="4" transform="rotate(-8 59 63)" />
      <path d="M46 56 l26 -4 M48 66 l26 -4" stroke={INK} strokeWidth="3" strokeDasharray="3 5" />
      <path d="M84 20 L104 40" stroke={INK} strokeWidth="5" />
      <circle cx="86" cy="22" r="3" fill="#fff" stroke={INK} strokeWidth="2" />
      <path d="M104 40 C 112 60, 80 70, 74 60" stroke="#ff6847" strokeWidth="4" fill="none" />
    </g>
  );
}

function Bread() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="60" cy="96" rx="44" ry="8" fill={INK} opacity=".12" />
      <path d="M18 70 C 18 38, 102 38, 102 70 C 102 88, 18 88, 18 70 Z" fill="#ffc93c" stroke={INK} strokeWidth="4" />
      <path d="M40 54 l8 14 M58 50 l6 16 M76 54 l4 14" stroke={INK} strokeWidth="4" />
      <circle cx="94" cy="30" r="6" fill="#ffb5c2" stroke={INK} strokeWidth="3" />
      <path d="M22 26 l6 6 M28 26 l-6 6" stroke="#ff6847" strokeWidth="3" />
    </g>
  );
}

function Music() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M70 22 L92 14 L96 24 L74 32 Z" fill="#b49cff" stroke={INK} strokeWidth="4" />
      <path d="M74 30 L52 64" stroke={INK} strokeWidth="6" />
      <path d="M38 56 C 18 56, 14 86, 34 94 C 50 100, 70 92, 68 76 C 66 66, 56 58, 38 56 Z" fill="#ff6847" stroke={INK} strokeWidth="4" />
      <circle cx="44" cy="78" r="7" fill={INK} />
      <path d="M98 50 v20 a6 6 0 1 1 -4 -5" stroke={INK} strokeWidth="4" fill="none" />
      <path d="M20 30 v14 a5 5 0 1 1 -4 -4" stroke={INK} strokeWidth="4" fill="none" />
    </g>
  );
}

function Growing() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M38 74 h44 l-6 26 h-32 z" fill="#ff6847" stroke={INK} strokeWidth="4" />
      <path d="M60 74 C 60 56, 60 44, 60 30" stroke={INK} strokeWidth="4" />
      <path d="M60 50 C 40 48, 32 34, 34 26 C 48 26, 60 36, 60 50 Z" fill="#4fc59f" stroke={INK} strokeWidth="4" />
      <path d="M60 42 C 78 40, 86 26, 84 18 C 70 18, 60 28, 60 42 Z" fill="#4fc59f" stroke={INK} strokeWidth="4" />
      <circle cx="96" cy="34" r="5" fill="#ffc93c" stroke={INK} strokeWidth="3" />
    </g>
  );
}

function Making() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="38" cy="80" r="12" fill="#b49cff" stroke={INK} strokeWidth="4" />
      <circle cx="74" cy="84" r="12" fill="#b49cff" stroke={INK} strokeWidth="4" />
      <path d="M44 70 L84 26 M68 74 L40 26" stroke={INK} strokeWidth="5" />
      <path d="M90 50 l4 -8 l4 8 l8 4 l-8 4 l-4 8 l-4 -8 l-8 -4 z" fill="#ffc93c" stroke={INK} strokeWidth="3" />
    </g>
  );
}

const MAP: Record<string, () => React.ReactElement> = {
  repair: Repair,
  cooking: Bread,
  music: Music,
  growing: Growing,
  making: Making,
};

const BG: Record<string, string> = {
  repair: "#ffe3d9",
  cooking: "#fff1c9",
  music: "#ece5ff",
  growing: "#dcf5ea",
  making: "#e3f2ff",
};

export function Doodle({ category, className = "h-24 w-24", bg = true }: { category: string; className?: string; bg?: boolean }) {
  const Art = MAP[category] ?? Making;
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      {bg && <circle cx="60" cy="60" r="56" fill={BG[category] ?? "#e3f2ff"} />}
      <Art />
    </svg>
  );
}

export const CATEGORIES = [
  { id: "repair", label: "Repair & mending" },
  { id: "making", label: "Making & crafts" },
  { id: "cooking", label: "Cooking & food" },
  { id: "music", label: "Music" },
  { id: "growing", label: "Growing & plants" },
];

export const EFFORT: Record<string, { label: string; emoji: string }> = {
  easy: { label: "Easy-going", emoji: "🌤️" },
  some: { label: "A bit of effort", emoji: "💪" },
  stretch: { label: "A stretch", emoji: "🧗" },
};

/** A blob mascot used in empty states and the logo. */
export function Blob({ className = "h-12 w-12", mood = "happy" }: { className?: string; mood?: "happy" | "wow" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 4c14 0 26 9 27 24s-7 30-27 31S4 47 5 31 18 4 32 4z" fill="#ff6847" stroke={INK} strokeWidth="3" />
      <circle cx="24" cy="28" r="3.5" fill={INK} />
      <circle cx="40" cy="28" r="3.5" fill={INK} />
      {mood === "happy" ? (
        <path d="M23 39c5 6 13 6 18 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <ellipse cx="32" cy="41" rx="4" ry="5" fill={INK} />
      )}
      <circle cx="18" cy="36" r="3" fill="#ffb5c2" />
      <circle cx="46" cy="36" r="3" fill="#ffb5c2" />
    </svg>
  );
}
