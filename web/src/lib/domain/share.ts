import type { Action, CampaignKind, Channel, Ctx, Db, ID } from "./types";
import { canViewAction } from "./access";
import { fail, newId } from "./util";
import { PILOT_TZ } from "@/lib/config";

export const CHANNELS: Channel[] = ["x", "instagram", "tiktok", "link"];

export function parseChannel(v: string | undefined | null): Channel {
  return v === "x" || v === "instagram" || v === "tiktok" || v === "link" ? v : "unknown";
}

/** The only fields allowed in public share assets. Never the address, notes or attendees. */
export function publicShareFields(action: Action) {
  return {
    title: action.title,
    summary: action.summary,
    startsAt: action.startsAt,
    areaLabel: action.areaLabel,
    costLabel: action.costLabel,
    effort: action.effort,
    category: action.category,
  };
}

export function campaignUrl(baseUrl: string, action: Action, channel: Channel): string {
  const u = new URL(`/a/${action.slug}`, baseUrl);
  u.searchParams.set("c", action.campaignCode);
  u.searchParams.set("ch", channel);
  return u.toString();
}

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: PILOT_TZ });
}

export function defaultCaption(action: Action, channel: Channel): string {
  const f = publicShareFields(action);
  const base = `Let's actually do it: ${f.title} — ${when(f.startsAt)} in ${f.areaLabel}. ${f.costLabel}. Small group, beginners welcome.`;
  switch (channel) {
    case "x":
      return base;
    case "instagram":
      return `${base}\n\nLink in bio, or use code ${action.campaignCode} on the invite page.\n\n#letsactuallydoit`;
    case "tiktok":
      return `Saw it online, now we're doing it IRL ✨ ${f.title}, ${when(f.startsAt)}, ${f.areaLabel}. Code ${action.campaignCode} · link in bio #letsactuallydoit`;
    default:
      return base;
  }
}

/** X: an editable composer the user confirms. We never post on anyone's behalf. */
export function xComposerUrl(text: string, url: string): string {
  const u = new URL("https://x.com/intent/post");
  u.searchParams.set("text", text);
  u.searchParams.set("url", url);
  return u.toString();
}

export interface ShareCaps {
  canShareFiles: boolean;
  canShare: boolean;
  canClipboard: boolean;
}

export type ShareStrategy = "native-files" | "native-link" | "download-and-copy";

/** Instagram & TikTok have no web composer: use the device share sheet if we can, otherwise download + copy. */
export function chooseShareStrategy(channel: Channel, caps: ShareCaps): ShareStrategy {
  if (channel === "instagram" || channel === "tiktok") {
    if (caps.canShareFiles) return "native-files";
    return "download-and-copy";
  }
  if (caps.canShare) return "native-link";
  return "download-and-copy";
}

export const MANUAL_STEPS: Record<"instagram" | "tiktok", string[]> = {
  instagram: [
    "Save the image to your phone.",
    "Open Instagram, tap +, and choose Story or Post.",
    "Pick the image and paste the caption.",
    "Add the invite link with a Link sticker (Stories) or put it in your bio.",
  ],
  tiktok: [
    "Save the image to your phone.",
    "Open TikTok, tap +, then Upload and choose the image (or film your own clip!).",
    "Paste the caption — it includes your code.",
    "Put the invite link in your bio so people can find it.",
  ],
};

/** Share records are about what we can observe. Opening a share sheet is not proof of posting. */
export const SHARE_STATUS_LABEL: Record<CampaignKind, string> = {
  visit: "Someone opened your link",
  join: "Someone joined from your link",
  share_opened: "Share opened — we can't see whether it was posted",
  image_downloaded: "Image saved — not confirmed as posted",
  caption_copied: "Caption copied — not confirmed as posted",
  link_copied: "Link copied — not confirmed as posted",
};

export function recordCampaignEvent(
  db: Db,
  ctx: Ctx,
  actionId: ID,
  kind: CampaignKind,
  channel: Channel,
  code?: string,
): void {
  const action = db.actions.find((a) => a.id === actionId);
  if (!action) fail("not_found", "Not found.");
  if (!canViewAction(db, action, ctx)) return;
  // A visit only counts when it carries the plan's real campaign code.
  if (kind === "visit" && code !== action.campaignCode) return;
  db.campaignEvents.push({
    id: newId("cev"),
    actionId,
    code: code ?? action.campaignCode,
    channel,
    kind,
    userId: ctx.userId ?? undefined,
    createdAt: ctx.now.toISOString(),
  });
}
