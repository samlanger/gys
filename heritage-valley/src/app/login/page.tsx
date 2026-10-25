import { LoginForm } from "@/components/LoginForm";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="font-serif text-2xl font-semibold text-valley-900">Sign in</h1>
      <p className="text-sm text-stone-600">For the pilot team. We'll email you a sign-in link.</p>
      {error === "expired" && <p className="text-sm text-red-700">That link has expired or was already used.</p>}
      <LoginForm next={next} />
    </div>
  );
}
