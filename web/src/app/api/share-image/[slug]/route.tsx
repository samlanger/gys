import { ImageResponse } from "next/og";
import { getCtx } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { canViewAction } from "@/lib/domain/access";
import { publicShareFields } from "@/lib/domain/share";
import { APP_NAME, PILOT_TZ } from "@/lib/config";

const SIZES = { square: [1080, 1080], story: [1080, 1920], wide: [1200, 630] } as const;
// The bundled image font covers Latin-1. Other glyphs would make the renderer fetch fonts
// from the network at request time, so keep generated images self-contained.
const safe = (s: string) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "").trim();

const BG: Record<string, string> = { repair: "#ffe3d9", cooking: "#fff1c9", music: "#ece5ff", growing: "#dcf5ea", making: "#e3f2ff" };

/** An original share image built only from public fields. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const format = (new URL(req.url).searchParams.get("format") ?? "square") as keyof typeof SIZES;
  const [w, h] = SIZES[format] ?? SIZES.square;
  const ctx = await getCtx();
  const db = getStore().read();
  const a = db.actions.find((x) => x.slug === slug);
  if (!a || !canViewAction(db, a, ctx) || a.status === "draft") return new Response("Not found", { status: 404 });
  const raw = publicShareFields(a);
  const f = { ...raw, title: safe(raw.title), summary: safe(raw.summary), areaLabel: safe(raw.areaLabel), costLabel: safe(raw.costLabel) };
  const d = new Date(f.startsAt);
  const day = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: PILOT_TZ });
  const time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", timeZone: PILOT_TZ });
  const tall = format === "story";
  const wide = format === "wide";
  const scale = wide ? 0.62 : 1;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG[f.category] ?? "#fff7ec", padding: 64 * scale, fontFamily: "sans-serif", color: "#2a1f17" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64 * scale, height: 64 * scale, borderRadius: 999, background: "#ff6847", border: "5px solid #2a1f17" }} />
          <div style={{ fontSize: 44 * scale, fontWeight: 700 }}>{APP_NAME}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", marginTop: tall ? 120 : 24 * scale }}>
          <div style={{ display: "flex", alignSelf: "flex-start", background: "#ffc93c", border: "5px solid #2a1f17", borderRadius: 999, padding: `${12 * scale}px ${28 * scale}px`, fontSize: 36 * scale, fontWeight: 700 }}>
            Let's actually do it
          </div>
          <div style={{ fontSize: (tall ? 120 : 96) * scale, fontWeight: 800, lineHeight: 1.02, marginTop: 36 * scale, letterSpacing: -2 }}>{f.title}</div>
          {!wide && <div style={{ fontSize: 40, marginTop: 28, lineHeight: 1.3, maxWidth: 900 }}>{f.summary}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", background: "#fffdf8", border: "6px solid #2a1f17", borderRadius: 40 * scale, padding: 40 * scale, boxShadow: "10px 10px 0 #2a1f17", marginBottom: tall ? 160 : 0 }}>
          <div style={{ fontSize: 46 * scale, fontWeight: 700 }}>{`${day}, ${time}`}</div>
          <div style={{ fontSize: 40 * scale, marginTop: 10 }}>{`${f.areaLabel} - ${f.costLabel}`}</div>
          <div style={{ fontSize: 32 * scale, marginTop: 18, color: "#6b5a4c" }}>Small group, beginners welcome. Tap the link to join.</div>
        </div>
      </div>
    ),
    { width: w, height: h, headers: { "Cache-Control": "public, max-age=300" } },
  );
}
