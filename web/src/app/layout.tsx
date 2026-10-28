import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_URL, IS_DEMO, TAGLINE } from "@/lib/config";
import { Header, BottomNav } from "@/components/Header";
import { DemoBar } from "@/components/DemoBar";
import { Flash } from "@/components/Flash";
import { load } from "@/lib/session-data";

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", weight: ["500", "600", "700"] });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `${APP_NAME} — ${TAGLINE}`, template: `%s · ${APP_NAME}` },
  description: "Turn online inspiration into things people do together.",
};

export const viewport: Viewport = { themeColor: "#fff7ec", width: "device-width", initialScale: 1 };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { db, user } = await load();
  const unread = user ? db.notifications.filter((n) => n.userId === user.id && !n.readAt).length : 0;
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-dvh pb-24 sm:pb-10">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-xl focus:bg-paper focus:p-3">
          Skip to content
        </a>
        {IS_DEMO && <DemoBar currentUserId={user?.id ?? null} />}
        <Header user={user ? { name: user.name, isOperator: user.isOperator } : null} unread={unread} />
        <Flash />
        <main id="main" className="mx-auto max-w-3xl px-4 py-6">
          {children}
        </main>
        <footer className="mx-auto max-w-3xl px-4 pb-8 pt-4 text-center text-xs text-muted">
          <p>
            {APP_NAME} · an adult, invitation-based pilot ·{" "}
            <a className="underline" href="/safety">
              Safety &amp; privacy
            </a>
          </p>
        </footer>
        <BottomNav signedIn={!!user} isOperator={!!user?.isOperator} />
      </body>
    </html>
  );
}
