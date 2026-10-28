import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { load } from "@/lib/session-data";
import { canManageAction, isCircleMember } from "@/lib/domain/access";
import { publishReadiness } from "@/lib/domain/actions";
import { PlanEditor } from "./PlanEditor";

export const metadata = { title: "Edit plan" };

export default async function EditPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, ctx, user } = await load();
  if (!user) redirect(`/signin?next=/plan/${id}/edit`);
  const a = db.actions.find((x) => x.id === id);
  if (!a) notFound();
  if (!canManageAction(db, a, ctx.userId)) {
    return <p className="card p-6">Only the host can edit this plan.</p>;
  }
  if (a.status === "completed" || a.status === "cancelled") redirect(`/plan/${id}/manage`);
  if (a.status === "in_review") redirect(`/plan/${id}/manage`);

  const established =
    !!a.circleId && isCircleMember(db, a.circleId, user.id) && db.actions.some((x) => x.circleId === a.circleId && x.id !== a.id && (x.status === "completed" || x.status === "published"));
  const needsReview = a.status === "draft" && user.hostStatus !== "approved" && !established;
  const source = a.adaptedFromId ? db.actions.find((x) => x.id === a.adaptedFromId) : undefined;
  const circle = a.circleId ? db.circles.find((c) => c.id === a.circleId) : undefined;
  const confirmed = db.rsvps.filter((r) => r.actionId === a.id && r.status === "confirmed").length;

  return (
    <div className="space-y-5">
      <header>
        <Link href={a.status === "draft" ? "/me" : `/plan/${a.id}/manage`} className="block w-fit text-sm text-muted underline">
          ← back
        </Link>
        <p className="chip mt-3 w-fit bg-sun">{a.status === "draft" ? "Step 2 of 3 · the practical bits" : "Editing a live plan"}</p>
        <h1 className="mt-2 text-3xl font-bold">{a.status === "draft" ? "Make it clear and inviting" : "Update your plan"}</h1>
        {circle && (
          <p className="mt-1 text-muted">
            For {circle.emoji} {circle.name}
          </p>
        )}
        {source && (
          <p className="mt-2 rounded-2xl bg-mint/30 p-3 text-sm">
            🌱 Adapted from <b>{source.title}</b>. We copied the format only — no address, people, chats or stories came with it. Add your own date, place and size.
          </p>
        )}
        {a.reviewNote && (
          <p className="mt-2 rounded-2xl bg-blush p-3 text-sm" role="alert">
            <b>Note from the pilot team:</b> {a.reviewNote}
          </p>
        )}
        {a.status === "published" && (
          <p className="mt-2 rounded-2xl bg-sky/30 p-3 text-sm">If you change the time or place, everyone who&apos;s coming gets told automatically.</p>
        )}
      </header>
      <PlanEditor
        initial={{
          id: a.id,
          status: a.status,
          title: a.title,
          summary: a.summary,
          whatToExpect: a.whatToExpect,
          category: a.category,
          startsAt: a.startsAt,
          durationMins: a.durationMins,
          effort: a.effort,
          costLabel: a.costLabel,
          accessibility: a.accessibility,
          areaLabel: a.areaLabel,
          venueName: a.venueName,
          venueAddress: a.venueAddress,
          venueNotes: a.venueNotes,
          capacity: a.capacity,
          visibility: a.visibility,
          allowAdaptation: a.allowAdaptation,
          sourceUrl: a.sourceUrl ?? "",
          sourceCredit: a.sourceCredit ?? "",
          roles: a.roles,
          lessons: a.lessons,
        }}
        hostName={user.name}
        needsReview={needsReview}
        problems={publishReadiness(a, ctx.now)}
        minCapacity={Math.max(2, confirmed)}
      />
    </div>
  );
}
