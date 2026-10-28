import { redirect } from "next/navigation";
import { load } from "@/lib/session-data";
import { ReportForm } from "./ReportForm";

export const metadata = { title: "Report a concern" };

const TYPES = ["action", "user", "message", "story", "circle"] as const;

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ type?: string; id?: string }> }) {
  const sp = await searchParams;
  const { user } = await load();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/report?type=${sp.type ?? ""}&id=${sp.id ?? ""}`)}`);
  const type = TYPES.find((t) => t === sp.type) ?? "action";
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-3xl font-bold">Report a concern</h1>
      <p className="text-muted">A real person on the pilot team reads every report. The person you report isn&apos;t told who reported them.</p>
      <ReportForm targetType={type} targetId={sp.id ?? ""} />
      <p className="text-sm">
        <b>In danger right now?</b> Contact local emergency services first.
      </p>
    </div>
  );
}
