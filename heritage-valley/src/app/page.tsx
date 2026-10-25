import Link from "next/link";

const ROOMS = [
  {
    href: "/dream",
    name: "Dream Room",
    line: "Record each stakeholder's picture of the valley in 2040, then see where visions align and conflict.",
    status: "Next phase",
  },
  {
    href: "/ground-truth",
    name: "Ground Truth Room",
    line: "Ask the cited library, review the policy register, and explore how other towns reinvented themselves.",
    status: "Available",
  },
  {
    href: "/pathway",
    name: "Pathway Room",
    line: "Work back from the shared North Star to a Now / Next / Later roadmap, each step tied to evidence.",
    status: "Later phase",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="font-serif text-3xl font-semibold text-valley-900 sm:text-4xl">
          See the future you want, see what stands in the way, and see the next three moves.
        </h1>
        <p className="max-w-2xl text-lg text-stone-600">
          For Fillmore, Piru, Santa Paula, and Ventura County — with a source for every claim.
        </p>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {ROOMS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:border-valley-600"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold text-valley-900">{r.name}</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${r.status === "Available" ? "bg-valley-100 text-valley-700" : "bg-stone-100 text-stone-500"}`}
              >
                {r.status}
              </span>
            </div>
            <p className="text-sm text-stone-600">{r.line}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
