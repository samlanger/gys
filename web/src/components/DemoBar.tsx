import { signInAsSample, demoReset } from "@/app/actions";
import { SAMPLE_PERSONAS } from "@/lib/store/seed";

export function DemoBar({ currentUserId }: { currentUserId: string | null }) {
  return (
    <div className="border-b-2 border-ink bg-sun/70 text-sm">
      <details className="mx-auto max-w-3xl px-4 py-2">
        <summary className="cursor-pointer list-none font-semibold">
          <span className="mr-1">🧪</span> Demo mode — the people and activity here are <u>sample data</u>, not real.{" "}
          <span className="underline">Try as…</span>
        </summary>
        <div className="mt-3 grid gap-2 pb-2 sm:grid-cols-2">
          {SAMPLE_PERSONAS.map((p) => (
            <form key={p.id} action={signInAsSample}>
              <input type="hidden" name="persona" value={p.id} />
              <button
                className={`w-full rounded-xl border-2 border-ink px-3 py-2 text-left ${currentUserId === p.id ? "bg-ink text-cream" : "bg-paper hover:bg-white"}`}
              >
                <b>{p.label}</b> <span className="opacity-75">— {p.hint}</span>
              </button>
            </form>
          ))}
        </div>
        <form action={demoReset} className="pb-1">
          <button className="text-xs underline">Reset demo data</button>
        </form>
      </details>
    </div>
  );
}
