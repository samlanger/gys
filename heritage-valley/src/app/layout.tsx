import type { Metadata } from "next";
import Link from "next/link";
import { currentSession } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heritage Valley Futures Studio",
  description: "See the future you want, see what stands in the way, and see the next three moves — with a source for every claim.",
};

const NAV = [
  { href: "/dream", label: "Dream Room" },
  { href: "/ground-truth", label: "Ground Truth" },
  { href: "/pathway", label: "Pathway Room" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="no-print border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-serif text-lg font-semibold text-valley-900">
              Heritage Valley Futures Studio
            </Link>
            {session && (
              <nav className="flex flex-wrap gap-4 text-sm">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="text-stone-600 hover:text-valley-700">
                    {n.label}
                  </Link>
                ))}
              </nav>
            )}
            {session && (
              <form action="/api/auth/logout" method="post" className="ml-auto flex items-center gap-3 text-sm text-stone-500">
                <span>
                  {session.email} · {session.role}
                </span>
                <button className="underline hover:text-stone-800">Sign out</button>
              </form>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="no-print mx-auto max-w-5xl px-4 pb-8 text-xs text-stone-500">
          Pilot tool. Anything entered may be subject to the California Public Records Act. Nothing here is published
          to the public until a named staff member approves it.
        </footer>
      </body>
    </html>
  );
}
