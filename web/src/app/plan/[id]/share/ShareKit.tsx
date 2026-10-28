"use client";

import { useEffect, useState } from "react";
import { trackShare } from "@/app/actions";
import { chooseShareStrategy, xComposerUrl, type ShareCaps } from "@/lib/domain/share";
import type { Channel } from "@/lib/domain/types";
import { CopyButton } from "@/components/CopyButton";

type Ch = { id: "x" | "instagram" | "tiktok" | "link"; url: string; caption: string };

const META: Record<Ch["id"], { label: string; emoji: string; format: "square" | "story" | "wide" }> = {
  x: { label: "X", emoji: "𝕏", format: "wide" },
  instagram: { label: "Instagram", emoji: "📸", format: "story" },
  tiktok: { label: "TikTok", emoji: "🎵", format: "story" },
  link: { label: "Group chat", emoji: "💬", format: "square" },
};

export function ShareKit({ actionId, slug, channels, manual }: { actionId: string; slug: string; channels: Ch[]; manual: Record<"instagram" | "tiktok", string[]> }) {
  const [active, setActive] = useState<Ch["id"]>("instagram");
  const [captions, setCaptions] = useState(() => Object.fromEntries(channels.map((c) => [c.id, c.caption])) as Record<Ch["id"], string>);
  const [caps, setCaps] = useState<ShareCaps>({ canShare: false, canShareFiles: false, canClipboard: false });
  const [status, setStatus] = useState<string | null>(null);
  const [format, setFormat] = useState<"square" | "story" | "wide">(META.instagram.format);

  const ch = channels.find((c) => c.id === active)!;
  const caption = captions[active];
  const imageUrl = `/api/share-image/${slug}?format=${format}`;
  const strategy = chooseShareStrategy(active as Channel, caps);
  const fullText = active === "x" ? caption : `${caption}\n\n${ch.url}`;

  useEffect(() => {
    const probe = new File([new Blob(["x"], { type: "image/png" })], "x.png", { type: "image/png" });
    setCaps({
      canShare: typeof navigator.share === "function",
      canShareFiles: typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }),
      canClipboard: !!navigator.clipboard,
    });
  }, []);

  useEffect(() => {
    setFormat(META[active].format);
    setStatus(null);
  }, [active]);

  async function nativeShare(withFile: boolean) {
    try {
      const data: ShareData = { text: fullText, url: active === "link" ? ch.url : undefined };
      if (withFile) {
        const blob = await (await fetch(imageUrl)).blob();
        data.files = [new File([blob], `${slug}.png`, { type: "image/png" })];
      }
      await trackShare(actionId, "share_opened", active);
      await navigator.share(data);
      setStatus("Share sheet opened. We can't see whether you posted — that's up to you.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus("Your device couldn't share directly — use the download and copy buttons instead.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2" role="tablist" aria-label="Where are you sharing?">
        {channels.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={active === c.id}
            onClick={() => setActive(c.id)}
            className={`rounded-2xl border-2 border-ink py-3 font-display text-sm font-semibold transition ${active === c.id ? "-translate-y-0.5 bg-ink text-cream shadow-sticker" : "bg-paper"}`}
          >
            <span className="block text-xl" aria-hidden>
              {META[c.id].emoji}
            </span>
            {META[c.id].label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-ink bg-cream px-4 py-2 text-sm">
          <span className="font-bold">Your share image</span>
          <span className="flex gap-1">
            {(["square", "story", "wide"] as const).map((f) => (
              <button key={f} onClick={() => setFormat(f)} className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${format === f ? "bg-ink text-cream" : ""}`}>
                {f}
              </button>
            ))}
          </span>
        </div>
        <div className="flex justify-center bg-[repeating-linear-gradient(45deg,#fff7ec,#fff7ec_10px,#fffdf8_10px,#fffdf8_20px)] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Share image showing the plan title, date, area and cost"
            className={`rounded-xl border-2 border-ink shadow-sticker ${format === "story" ? "max-h-96" : "w-full max-w-sm"}`}
          />
        </div>
        <p className="px-4 py-2 text-xs text-muted">Made from public details only — never the address or who&apos;s coming.</p>
      </div>

      <div className="card space-y-3 p-4">
        <label htmlFor="caption" className="label">
          Caption (edit it — your voice is better than ours)
        </label>
        <textarea id="caption" className="input" rows={4} value={caption} onChange={(e) => setCaptions((c) => ({ ...c, [active]: e.target.value }))} />
        <p className="break-all text-xs text-muted">Link: {ch.url}</p>

        <div className="grid gap-2">
          {active === "x" && (
            <button
              className="btn-primary"
              onClick={async () => {
                await trackShare(actionId, "share_opened", "x");
                window.open(xComposerUrl(caption, ch.url), "_blank", "noopener,noreferrer");
                setStatus("We opened X with your post ready to edit. Nothing is posted unless you press Post there.");
              }}
            >
              Open X with this post →
            </button>
          )}

          {(active === "instagram" || active === "tiktok") && strategy === "native-files" && (
            <button className="btn-primary" onClick={() => nativeShare(true)}>
              Share to {META[active].label}…
            </button>
          )}

          {active === "link" && strategy === "native-link" && (
            <button className="btn-primary" onClick={() => nativeShare(false)}>
              Share…
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <a
              href={imageUrl}
              download={`${slug}-${format}.png`}
              className="btn-ghost btn-sm"
              onClick={() => {
                void trackShare(actionId, "image_downloaded", active);
                setStatus("Image saved. Post it whenever you're ready.");
              }}
            >
              ⬇️ Save image
            </a>
            <CopyButton
              text={fullText}
              label="📋 Copy caption"
              onCopied={() => {
                void trackShare(actionId, "caption_copied", active);
              }}
            />
          </div>
          <CopyButton
            text={ch.url}
            label="🔗 Copy link only"
            className="btn-ghost btn-sm"
            onCopied={() => {
              void trackShare(actionId, "link_copied", active);
            }}
          />
        </div>

        {status && (
          <p role="status" className="rounded-2xl bg-sun/40 p-3 text-sm font-semibold">
            {status}
          </p>
        )}
      </div>

      {(active === "instagram" || active === "tiktok") && (
        <div className="card bg-lilac/20 p-4 text-sm">
          <p className="font-bold">
            {strategy === "native-files" ? "If the share button doesn't show " + META[active].label + ":" : `How to post on ${META[active].label}:`}
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            {manual[active].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted">We can&apos;t post to {META[active].label} for you (and wouldn&apos;t without asking).</p>
        </div>
      )}
    </div>
  );
}
