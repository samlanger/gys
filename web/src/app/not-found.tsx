import Link from "next/link";
import { Blob } from "@/components/Doodle";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <Blob className="mx-auto h-16 w-16" mood="wow" />
      <h1 className="mt-3 text-2xl font-bold">We couldn&apos;t find that</h1>
      <p className="mt-1 text-muted">It may have been removed, or the link is mistyped.</p>
      <Link href="/" className="btn-primary mt-5">
        Home
      </Link>
    </div>
  );
}
