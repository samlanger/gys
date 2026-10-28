import { APP_NAME } from "@/lib/config";

export const metadata = { title: "Safety & privacy" };

const RULES = [
  ["👥", "Adults, by invitation", "The pilot is for people 18+. Hosts are reviewed by a person before their first gathering."],
  ["🏛️", "Public places", "Gatherings happen in public or partner venues — libraries, community halls, cafés — not private homes."],
  ["🔒", "Details stay private", "The exact address and the Circle conversation are only for confirmed participants. Never on public pages or share images."],
  ["🎟️", "Fair places", "Places and roles are first-come, and the system won't overfill — even when lots of people tap at once. Waitlists move up automatically."],
  ["🚪", "Leave any time", "Give up a place, leave a Circle, or turn off notifications whenever you like."],
  ["📖", "Stories need permission", "A story only goes public once everyone who took part agrees. Anyone can make it private again."],
  ["💬", "Feedback is private", "Hosts only see totals, and only once at least five people have answered. Your notes are never shown to them."],
  ["🛟", "Reports & appeals", "Report a concern from any plan, Circle or message. A person reviews it. Disagree with a decision? Appeal from your page."],
  ["🗂️", "Your data", "Download everything about you, or ask us to delete your account. We don't sell relationship data or run ads."],
  ["🧾", "Honest numbers", "We keep RSVPs, self-reported attendance and host-confirmed attendance separate, and never invent impact."],
];

export default function Safety() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">How {APP_NAME} keeps things safe</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {RULES.map(([e, t, d]) => (
          <li key={t} className="card p-5">
            <p className="text-3xl" aria-hidden>
              {e}
            </p>
            <h2 className="mt-1 text-lg font-bold">{t}</h2>
            <p className="text-sm">{d}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
