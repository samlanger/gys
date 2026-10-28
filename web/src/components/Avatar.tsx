const COLORS = ["bg-tomato", "bg-sun", "bg-mint", "bg-sky", "bg-lilac", "bg-blush"];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, size = "md", ring = false }: { name: string; size?: "sm" | "md" | "lg"; ring?: boolean }) {
  const s = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-14 w-14 text-xl" : "h-10 w-10 text-sm";
  const anon = !name;
  return (
    <span
      aria-hidden={anon}
      title={name || undefined}
      className={`${s} ${anon ? "bg-cream" : COLORS[hash(name) % COLORS.length]} inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink font-display font-bold ${ring ? "ring-4 ring-cream" : ""}`}
    >
      {anon ? "🙂" : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function AvatarStack({ names, max = 6, total }: { names: string[]; max?: number; total?: number }) {
  const shown = names.slice(0, max);
  const extra = (total ?? names.length) - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((n, i) => (
        <span key={i} className="-ml-2 first:ml-0">
          <Avatar name={n} size="sm" ring />
        </span>
      ))}
      {extra > 0 && <span className="ml-1 text-sm font-semibold text-muted">+{extra}</span>}
    </div>
  );
}
