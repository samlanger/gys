"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { savePlan } from "@/app/actions";
import type { RoleSlot } from "@/lib/domain/types";
import { CATEGORIES, Doodle, EFFORT } from "@/components/Doodle";
import { SubmitButton } from "@/components/SubmitButton";

interface Initial {
  id: string;
  status: string;
  title: string;
  summary: string;
  whatToExpect: string;
  category: string;
  startsAt: string;
  durationMins: number;
  effort: string;
  costLabel: string;
  accessibility: string;
  areaLabel: string;
  venueName: string;
  venueAddress: string;
  venueNotes: string;
  capacity: number;
  visibility: string;
  allowAdaptation: boolean;
  sourceUrl: string;
  sourceCredit: string;
  roles: RoleSlot[];
  lessons: string[];
}

const ROLE_IDEAS = [
  { name: "Welcomer", emoji: "👋", description: "Say hi at the door.", capacity: 1 },
  { name: "Snacks", emoji: "🍪", description: "Bring something to share.", capacity: 2 },
  { name: "Kit keeper", emoji: "🧰", description: "Bring spare tools or materials.", capacity: 1 },
  { name: "Tidy-up crew", emoji: "🧹", description: "Help leave the space nice.", capacity: 2 },
  { name: "Photographer", emoji: "📸", description: "Only of things — ask before photographing people.", capacity: 1 },
  { name: "Story-taker", emoji: "📝", description: "Note what worked for next time.", capacity: 1 },
];

const pad = (n: number) => String(n).padStart(2, "0");

function Section({ n, title, children, tone = "" }: { n: number; title: string; children: React.ReactNode; tone?: string }) {
  return (
    <section className={`card space-y-4 p-5 ${tone}`}>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-sun font-display text-sm">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Lock() {
  return (
    <span className="ml-1 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cream" title="Private">
      🔒 private
    </span>
  );
}

export function PlanEditor({
  initial,
  hostName,
  needsReview,
  problems,
  minCapacity,
}: {
  initial: Initial;
  hostName: string;
  needsReview: boolean;
  problems: string[];
  minCapacity: number;
}) {
  const [state, action] = useActionState(savePlan, null);
  const [f, setF] = useState(initial);
  const [roles, setRoles] = useState(initial.roles.map((r) => ({ ...r })));
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [tz, setTz] = useState(0);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  // Set by whichever button was pressed (more reliable than the submitter's name/value).
  const intent = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const d = new Date(initial.startsAt);
    setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setTz(d.getTimezoneOffset());
  }, [initial.startsAt]);

  const set = <K extends keyof Initial>(k: K, v: Initial[K]) => setF((p) => ({ ...p, [k]: v }));
  const isDraft = initial.status === "draft";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={f.id} />
      <input type="hidden" name="tzOffset" value={tz} />
      <input type="hidden" name="intent" defaultValue="save" ref={intent} />

      <div className="sticky top-16 z-20 flex gap-2 rounded-2xl border-2 border-ink bg-paper p-1 shadow-sticker" role="tablist">
        {(["edit", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2 font-display font-semibold ${tab === t ? "bg-ink text-cream" : ""}`}
          >
            {t === "edit" ? "✏️ Edit" : "👀 Preview"}
          </button>
        ))}
      </div>

      <div className={tab === "edit" ? "space-y-5" : "hidden"}>
        <Section n={1} title="The idea">
          <div>
            <label className="label" htmlFor="title">
              Title
            </label>
            <input id="title" name="title" className="input" value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="summary">
              One-line invitation
            </label>
            <input id="summary" name="summary" className="input" value={f.summary} onChange={(e) => set("summary", e.target.value)} maxLength={240} placeholder="Bring one thing with a hole. Leave with it fixed." />
          </div>
          <div>
            <span className="label">Kind of thing</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <label key={c.id} className={`chip cursor-pointer ${f.category === c.id ? "bg-sun" : ""}`}>
                  <input type="radio" name="category" value={c.id} className="sr-only" checked={f.category === c.id} onChange={() => set("category", c.id)} />
                  <Doodle category={c.id} className="h-5 w-5" bg={false} /> {c.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="whatToExpect">
              What to expect
            </label>
            <textarea id="whatToExpect" name="whatToExpect" className="input" rows={4} value={f.whatToExpect} onChange={(e) => set("whatToExpect", e.target.value)} maxLength={1200} placeholder="How it starts, what people do, how it ends. Say if no experience is needed." />
          </div>
        </Section>

        <Section n={2} title="When & where">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="date">
                Date
              </label>
              <input id="date" name="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="time">
                Start time
              </label>
              <input id="time" name="time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="durationMins">
              How long? <span className="font-normal text-muted">{Math.floor(f.durationMins / 60)}h{f.durationMins % 60 ? ` ${f.durationMins % 60}m` : ""}</span>
            </label>
            <input id="durationMins" name="durationMins" type="range" min={30} max={360} step={15} value={f.durationMins} onChange={(e) => set("durationMins", Number(e.target.value))} className="w-full accent-tomato" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="areaLabel">
                Area (public)
              </label>
              <input id="areaLabel" name="areaLabel" className="input" value={f.areaLabel} onChange={(e) => set("areaLabel", e.target.value)} placeholder="Hackney, London" maxLength={60} />
            </div>
            <div>
              <label className="label" htmlFor="venueName">
                Venue name (public)
              </label>
              <input id="venueName" name="venueName" className="input" value={f.venueName} onChange={(e) => set("venueName", e.target.value)} placeholder="Library community room" maxLength={80} />
              <p className="hint">Pilot gatherings happen in public or partner venues — not homes.</p>
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border-2 border-dashed border-ink/40 bg-cream p-4">
            <div>
              <label className="label" htmlFor="venueAddress">
                Exact address <Lock />
              </label>
              <input id="venueAddress" name="venueAddress" className="input" value={f.venueAddress} onChange={(e) => set("venueAddress", e.target.value)} maxLength={200} />
            </div>
            <div>
              <label className="label" htmlFor="venueNotes">
                Arrival notes <Lock />
              </label>
              <input id="venueNotes" name="venueNotes" className="input" value={f.venueNotes} onChange={(e) => set("venueNotes", e.target.value)} placeholder="Side door, room 2, lift available" maxLength={400} />
            </div>
            <p className="text-xs text-muted">Only confirmed participants see these. Never on the public page, share images or waitlist.</p>
          </div>
        </Section>

        <Section n={3} title="Practical details">
          <div>
            <label className="label" htmlFor="capacity">
              How many people? <span className="font-display text-xl">{f.capacity}</span>
            </label>
            <input id="capacity" name="capacity" type="range" min={minCapacity} max={30} value={f.capacity} onChange={(e) => set("capacity", Number(e.target.value))} className="w-full accent-tomato" />
            <p className="hint">Small is good. 6–10 is the sweet spot for getting to know each other.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="costLabel">
                Cost
              </label>
              <input id="costLabel" name="costLabel" className="input" value={f.costLabel} onChange={(e) => set("costLabel", e.target.value)} maxLength={60} placeholder="Free · materials provided" />
            </div>
            <div>
              <span className="label">Effort</span>
              <div className="flex gap-2">
                {Object.entries(EFFORT).map(([k, e]) => (
                  <label key={k} className={`chip flex-1 cursor-pointer justify-center ${f.effort === k ? "bg-sun" : ""}`}>
                    <input type="radio" name="effort" value={k} className="sr-only" checked={f.effort === k} onChange={() => set("effort", k)} />
                    <span aria-hidden>{e.emoji}</span> <span className="text-xs">{e.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="accessibility">
              Accessibility
            </label>
            <textarea id="accessibility" name="accessibility" className="input" rows={3} value={f.accessibility} onChange={(e) => set("accessibility", e.target.value)} maxLength={400} placeholder="Step-free? Seating? Toilets? Quiet space? Say what you know — and what you don't." />
          </div>
        </Section>

        <Section n={4} title="Small ways to pitch in" tone="bg-sun/20">
          <p className="text-sm text-muted">Optional roles make it easier to host — and easier for people to feel part of it.</p>
          <ul className="space-y-2">
            {roles.map((r, i) => (
              <li key={r.id || i} className="flex items-start gap-2 rounded-2xl border-2 border-ink/20 bg-paper p-2">
                <input type="hidden" name="role_id" value={r.id} />
                <label className="sr-only" htmlFor={`re${i}`}>
                  Emoji
                </label>
                <input id={`re${i}`} name="role_emoji" className="input w-14 px-2 text-center text-xl" value={r.emoji} onChange={(e) => setRoles((rs) => rs.map((x, j) => (j === i ? { ...x, emoji: e.target.value } : x)))} maxLength={8} />
                <div className="flex-1 space-y-1">
                  <label className="sr-only" htmlFor={`rn${i}`}>
                    Role name
                  </label>
                  <input id={`rn${i}`} name="role_name" className="input py-2" value={r.name} onChange={(e) => setRoles((rs) => rs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} maxLength={40} />
                  <label className="sr-only" htmlFor={`rd${i}`}>
                    Description
                  </label>
                  <input id={`rd${i}`} name="role_desc" className="input py-2 text-sm" value={r.description} onChange={(e) => setRoles((rs) => rs.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} maxLength={140} placeholder="What does it involve?" />
                </div>
                <label className="sr-only" htmlFor={`rc${i}`}>
                  How many people
                </label>
                <input id={`rc${i}`} name="role_cap" type="number" min={1} max={10} className="input w-16 px-2 text-center" value={r.capacity} onChange={(e) => setRoles((rs) => rs.map((x, j) => (j === i ? { ...x, capacity: Number(e.target.value) } : x)))} />
                <button type="button" aria-label={`Remove ${r.name}`} className="p-2 text-xl" onClick={() => setRoles((rs) => rs.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {ROLE_IDEAS.filter((idea) => !roles.some((r) => r.name === idea.name)).map((idea) => (
              <button type="button" key={idea.name} className="chip hover:bg-sun" onClick={() => roles.length < 8 && setRoles((rs) => [...rs, { ...idea, id: "" }])}>
                ＋ {idea.emoji} {idea.name}
              </button>
            ))}
          </div>
        </Section>

        <Section n={5} title="Who can see it & where it came from">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { v: "public", t: "🌍 Anyone with the link", d: "Shows up for people in the pilot. Exact address stays private." },
              { v: "invite", t: "💌 Invite-only", d: "Only people with an invitation link (which expires)." },
            ].map((o) => (
              <label key={o.v} className={`cursor-pointer rounded-2xl border-2 p-3 ${f.visibility === o.v ? "border-ink bg-sun/30" : "border-ink/20"}`}>
                <input type="radio" name="visibility" value={o.v} checked={f.visibility === o.v} onChange={() => set("visibility", o.v)} className="mr-2 accent-tomato" />
                <b>{o.t}</b>
                <span className="block text-sm text-muted">{o.d}</span>
              </label>
            ))}
          </div>
          <label className="flex items-start gap-3 rounded-2xl bg-mint/20 p-3">
            <input type="checkbox" name="allowAdaptation" checked={f.allowAdaptation} onChange={(e) => set("allowAdaptation", e.target.checked)} className="mt-1 h-5 w-5 accent-tomato" />
            <span>
              <b>Let other groups adapt this format 🌱</b>
              <span className="block text-sm text-muted">They get a copy of the format only — never your address, people, chats or stories. You&apos;ll be credited.</span>
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="sourceUrl">
                Inspiration link (optional)
              </label>
              <input id="sourceUrl" name="sourceUrl" type="url" className="input" value={f.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label className="label" htmlFor="sourceCredit">
                Credit
              </label>
              <input id="sourceCredit" name="sourceCredit" className="input" value={f.sourceCredit} onChange={(e) => set("sourceCredit", e.target.value)} placeholder="@creator" maxLength={80} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="lessons">
              Lessons for next time (one per line)
            </label>
            <textarea id="lessons" name="lessons" className="input" rows={3} defaultValue={initial.lessons.join("\n")} placeholder="Pre-thread needles before people arrive" />
          </div>
        </Section>
      </div>

      {tab === "preview" && <Preview f={f} date={date} time={time} hostName={hostName} roles={roles} />}

      {problems.length > 0 && isDraft && (
        <div className="card bg-cream p-4 text-sm">
          <p className="font-bold">Before you publish:</p>
          <ul className="mt-1 list-inside list-disc">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted">(Save to refresh this list.)</p>
        </div>
      )}

      {state && (
        <p role={state.ok ? "status" : "alert"} className={`rounded-2xl p-3 font-semibold ${state.ok ? "bg-mint/40" : "bg-blush"}`}>
          {state.ok ? state.message : state.error}
        </p>
      )}

      <div className="sticky bottom-20 z-20 flex flex-wrap gap-2 rounded-3xl border-2 border-ink bg-paper p-3 shadow-sticker-lg sm:bottom-4">
        <SubmitButton className="btn-ghost flex-1" onClick={() => intent.current && (intent.current.value = "save")}>
          {isDraft ? "Save draft" : "Save changes"}
        </SubmitButton>
        {isDraft && (
          <SubmitButton className="btn-primary flex-[2]" pendingText="Publishing…" onClick={() => intent.current && (intent.current.value = "publish")}>
            {needsReview ? "Send for review →" : "Publish 🚀"}
          </SubmitButton>
        )}
      </div>
      {isDraft && needsReview && (
        <p className="text-center text-xs text-muted">
          New hosts get a quick, friendly check from a real person on the pilot team before going live. Usually within a day.
        </p>
      )}
    </form>
  );
}

function Preview({ f, date, time, hostName, roles }: { f: Initial; date: string; time: string; hostName: string; roles: RoleSlot[] }) {
  const when = date ? new Date(`${date}T${time || "14:00"}`).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }) : "Date TBC";
  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <p className="border-b-2 border-ink bg-sky/30 px-4 py-2 text-sm font-bold">🌍 What everyone sees</p>
        <div className="flex gap-4 p-4">
          <Doodle category={f.category} className="h-20 w-20 shrink-0" />
          <div>
            <h3 className="text-2xl font-bold">{f.title || "Your title"}</h3>
            <p>{f.summary || "Your one-line invitation"}</p>
            <p className="mt-2 text-sm">
              📅 {when}
              <br />📍 {f.venueName || "Venue"} · {f.areaLabel || "Area"}
              <br />💷 {f.costLabel} · {EFFORT[f.effort]?.label} · {f.capacity} places
              <br />🧑‍🍳 Hosted by {hostName}
            </p>
            {roles.length > 0 && <p className="mt-2 text-sm">Roles: {roles.map((r) => `${r.emoji} ${r.name}`).join(" · ")}</p>}
            <p className="mt-2 text-xs text-muted">{f.visibility === "invite" ? "💌 Invite-only: hidden without an invitation link." : "No exact address. No names of who's coming."}</p>
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <p className="border-b-2 border-ink bg-ink px-4 py-2 text-sm font-bold text-cream">🔒 Only confirmed people see</p>
        <div className="p-4 text-sm">
          <p>
            <b>Address:</b> {f.venueAddress || <i className="text-muted">not set</i>}
          </p>
          <p>
            <b>Arrival notes:</b> {f.venueNotes || <i className="text-muted">none</i>}
          </p>
          <p>
            <b>Plus:</b> names of others coming, roles, and the Circle chat.
          </p>
        </div>
      </div>
    </div>
  );
}
