import { notFound } from "next/navigation";
import { AnswerView } from "@/components/AnswerView";
import { PrintButton } from "@/components/PrintButton";
import { getAsk } from "@/lib/ask";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Brief({ params }: { params: Promise<{ id: string }> }) {
  const record = await getAsk(await getDb(), Number((await params).id));
  if (!record) notFound();
  return (
    <article className="mx-auto max-w-3xl space-y-6 bg-white p-8 shadow-sm print:p-0 print:shadow-none">
      <header className="space-y-1 border-b border-stone-200 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-valley-700">
          Heritage Valley Futures Studio · Library brief
        </p>
        <h1 className="font-serif text-2xl font-semibold">{record.question}</h1>
      </header>
      <AnswerView record={record} />
      <footer className="space-y-1 border-t border-stone-200 pt-4 text-xs text-stone-500">
        <p>
          Generated {new Date(record.createdAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} by{" "}
          {record.askedBy ?? "unknown user"} · Brief #{record.id} · Prompt {record.promptVersion}
          {record.model ? ` · Model ${record.model}` : ""}
        </p>
        <p>
          Draft for internal review. Answers are drawn only from the documents cited above; verify against the
          original pages before quoting. Not for public release until approved by a named staff member.
        </p>
      </footer>
      <PrintButton />
    </article>
  );
}
