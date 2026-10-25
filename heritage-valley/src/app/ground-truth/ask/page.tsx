import { AskForm } from "@/components/AskForm";
import { CONFIDENCE_LABELS } from "@/lib/citations";

export default function AskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-valley-900">Ask the library</h1>
        <p className="mt-1 max-w-2xl text-stone-600">
          Answers come only from documents in the library. Every statement links to the page it came from and is
          labeled {Object.values(CONFIDENCE_LABELS).map((l) => `“${l.toLowerCase()}”`).join(", ")}. If the library
          does not support an answer, you will see “Not found in the sources.”
        </p>
      </div>
      <AskForm />
    </div>
  );
}
