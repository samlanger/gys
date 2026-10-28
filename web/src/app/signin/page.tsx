import { IS_DEMO } from "@/lib/config";
import { SignInForm } from "./SignInForm";
import { signInAsSample } from "@/app/actions";
import { SAMPLE_PERSONAS } from "@/lib/store/seed";
import { Blob } from "@/components/Doodle";

export const metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/me" } = await searchParams;
  const joining = next.startsWith("/a/");
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <Blob className="mx-auto h-16 w-16 animate-float" />
        <h1 className="mt-3 text-3xl font-bold">{joining ? "Save your place" : "Welcome!"}</h1>
        <p className="mt-1 text-muted">{joining ? "Just a name and email so the host knows who's coming." : "Sign in or join — it's the same thing."}</p>
      </div>
      <SignInForm next={next} demo={IS_DEMO} />
      {IS_DEMO && (
        <div className="card space-y-2 bg-sun/30 p-5">
          <p className="font-display font-bold">🧪 Or try as a sample person</p>
          {SAMPLE_PERSONAS.map((p) => (
            <form key={p.id} action={signInAsSample}>
              <input type="hidden" name="persona" value={p.id} />
              <input type="hidden" name="next" value={next} />
              <button className="w-full rounded-xl border-2 border-ink bg-paper px-3 py-2 text-left text-sm hover:bg-white">
                <b>{p.label}</b> — {p.hint}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
