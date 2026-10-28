import { NextResponse } from "next/server";
import { getCtx } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { canSeePrivateDetails, canViewAction } from "@/lib/domain/access";
import { APP_NAME, APP_URL } from "@/lib/config";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getCtx();
  const db = getStore().read();
  const a = db.actions.find((x) => x.slug === slug);
  if (!a || !canViewAction(db, a, ctx)) return new NextResponse("Not found", { status: 404 });
  const end = new Date(new Date(a.startsAt).getTime() + a.durationMins * 60_000).toISOString();
  // The exact address only goes into calendars of confirmed participants.
  const location = canSeePrivateDetails(db, a, ctx.userId) ? `${a.venueName}, ${a.venueAddress}` : `${a.venueName}, ${a.areaLabel}`;
  const url = `${APP_URL}/a/${a.slug}`;
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${APP_NAME}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${a.id}@${new URL(APP_URL).host}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(a.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(a.title)}`,
    `DESCRIPTION:${esc(`${a.summary}\n\n${url}`)}`,
    `LOCATION:${esc(location)}`,
    `URL:${url}`,
    a.status === "cancelled" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(a.title)} soon`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${a.slug}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
