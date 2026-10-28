/** Product name is undecided: set NEXT_PUBLIC_APP_NAME to change it everywhere. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Huddle";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const TAGLINE = "Bring an idea. Find your people. Make it happen.";
export const DATA_BACKEND = (process.env.DATA_BACKEND || "demo") as "demo" | "supabase";
export const IS_DEMO = DATA_BACKEND === "demo";
/** Timezone for server-rendered text (share images, captions). Pages show the viewer's own timezone. */
export const PILOT_TZ = process.env.NEXT_PUBLIC_PILOT_TZ || "Europe/London";
