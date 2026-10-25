import Link from "next/link";

export function ComingSoon({ title, intro, items }: { title: string; intro: string; items: string[] }) {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-serif text-3xl font-semibold text-valley-900">{title}</h1>
      <p className="text-stone-600">{intro}</p>
      <ul className="list-disc space-y-1 pl-5 text-stone-700">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <p className="text-sm text-stone-500">
        The build order in SPEC.md puts the library first because this room depends on it.{" "}
        <Link href="/ground-truth" className="text-valley-700 underline">
          Go to the Ground Truth Room
        </Link>
        .
      </p>
    </div>
  );
}
