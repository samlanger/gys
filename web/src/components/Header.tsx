import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { Blob } from "./Doodle";

export function Header({ user, unread }: { user: { name: string; isOperator: boolean } | null; unread: number }) {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2" aria-label={`${APP_NAME} home`}>
          <Blob className="h-9 w-9 transition hover:animate-wiggle" />
          <span className="font-display text-2xl font-bold">{APP_NAME}</span>
        </Link>
        <nav className="flex items-center gap-1.5 text-sm font-semibold">
          {user?.isOperator && (
            <Link href="/ops" className="hidden rounded-xl px-3 py-2 hover:bg-paper sm:inline-block">
              Operator
            </Link>
          )}
          <Link href="/stories" className="hidden rounded-xl px-3 py-2 hover:bg-paper sm:inline-block">
            Stories
          </Link>
          <Link href="/plan/new" className="btn-sun btn-sm hidden sm:inline-flex">
            ＋ Make a plan
          </Link>
          {user ? (
            <Link href="/me" className="relative flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-paper" aria-label={`Your page${unread ? `, ${unread} new` : ""}`}>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-lilac font-display">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-5 animate-pop rounded-full border-2 border-ink bg-tomato px-1 text-center text-[11px] leading-4 text-white">
                  {unread}
                </span>
              )}
            </Link>
          ) : (
            <Link href="/signin" className="btn-ghost btn-sm">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function BottomNav({ signedIn, isOperator }: { signedIn: boolean; isOperator: boolean }) {
  const items = [
    { href: "/", label: "Home", icon: "🏡" },
    { href: "/me#circles", label: "Circles", icon: "🫶" },
    { href: "/plan/new", label: "Plan", icon: "＋", big: true },
    { href: "/stories", label: "Stories", icon: "📖" },
    isOperator ? { href: "/ops", label: "Ops", icon: "🛠️" } : { href: signedIn ? "/me" : "/signin", label: "Me", icon: "🙂" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden" aria-label="Main">
      <ul className="grid grid-cols-5">
        {items.map((i) => (
          <li key={i.label}>
            <Link href={i.href} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold">
              <span
                className={
                  i.big
                    ? "-mt-6 flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-tomato text-2xl text-white shadow-sticker"
                    : "text-xl"
                }
                aria-hidden
              >
                {i.icon}
              </span>
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
