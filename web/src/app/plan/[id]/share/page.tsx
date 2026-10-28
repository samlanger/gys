import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { load } from "@/lib/session-data";
import { canManageAction } from "@/lib/domain/access";
import { campaignUrl, defaultCaption, MANUAL_STEPS } from "@/lib/domain/share";
import { APP_URL } from "@/lib/config";
import { ShareKit } from "./ShareKit";
import { Confetti } from "@/components/Confetti";

export const metadata = { title: "Share kit" };

export default async function SharePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fresh?: string }> }) {
  const { id } = await params;
  const { fresh } = await searchParams;
  const { db, ctx, user } = await load();
  if (!user) redirect(`/signin?next=/plan/${id}/share`);
  const a = db.actions.find((x) => x.id === id);
  if (!a) notFound();
  if (!canManageAction(db, a, ctx.userId)) return <p className="card p-6">Only the host can use the share kit.</p>;
  if (a.status !== "published") redirect(`/plan/${id}/manage`);

  if (a.visibility === "invite") {
    return (
      <div className="card space-y-3 p-6">
        <h1 className="text-2xl font-bold">This plan is invite-only 💌</h1>
        <p>Public posts would send people to a page they can&apos;t open. Create an expiring invitation link and send it to the people you have in mind instead.</p>
        <Link href={`/plan/${id}/manage`} className="btn-sun">
          Make an invitation link
        </Link>
      </div>
    );
  }

  const channels = (["x", "instagram", "tiktok", "link"] as const).map((ch) => ({
    id: ch,
    url: campaignUrl(APP_URL, a, ch),
    caption: defaultCaption(a, ch),
  }));

  return (
    <div className="space-y-5">
      {fresh && <Confetti count={90} />}
      <header>
        <p className="chip bg-sun">Step 3 of 3</p>
        <h1 className="mt-2 text-3xl font-bold">{fresh ? "It's live! Let's tell people 📣" : "Share kit"}</h1>
        <p className="mt-1 text-muted">
          Each link carries the code <b className="font-mono">{a.campaignCode}</b> so you can see roughly what worked. We never post for you — you stay in control of every word.
        </p>
      </header>
      <ShareKit actionId={a.id} slug={a.slug} channels={channels} manual={MANUAL_STEPS} />
      <Link href={`/plan/${a.id}/manage`} className="btn-ghost w-full">
        Done — go to my host page
      </Link>
    </div>
  );
}
