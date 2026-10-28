// End-to-end smoke test of the full loop in a real browser (mobile viewport).
// Usage: start the app (npm run build && npm start), then: BASE_URL=http://localhost:3000 npm run e2e
import { createRequire } from "node:module";
// Uses the project dependency if installed, otherwise a globally installed Playwright.
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const shots = process.env.SHOTS_DIR;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
let n = 0;
const step = async (name) => {
  console.log("✓", name);
  if (shots) await p.screenshot({ path: `${shots}/e2e-${String(++n).padStart(2, "0")}.png`, fullPage: true });
};
const expect = async (text) => {
  await p.getByText(text, { exact: false }).first().waitFor({ timeout: 8000 });
};
const as = async (persona) => {
  await p.goto(`${BASE}/signin?next=/me`);
  await p.locator("form", { has: p.locator(`input[value="${persona}"]`) }).last().locator("button").click();
  await p.waitForURL((u) => new URL(u).pathname === "/me");
};

// Reset demo data
await p.goto(BASE);
await p.locator("summary", { hasText: "Demo mode" }).click();
await p.getByRole("button", { name: "Reset demo data" }).click();
await p.waitForURL(BASE + "/");

// 1. Anonymous visitor opens a campaign link: no address visible.
await p.goto(`${BASE}/a/beginner-repair-afternoon-mend3?c=MEND3&ch=instagram`);
await expect("Want to come?");
if (await p.getByText("Sample Street").count()) throw new Error("address leaked to public");
await step("public page hides the exact address");

// 2. Join → sign in → confirm → in.
await p.getByRole("button", { name: /Join this/ }).click();
await p.waitForURL(/signin/);
await p.fill("#name", "Robin");
await p.fill("#email", `robin${Date.now()}@test.invalid`);
await p.check('input[name="adult"]');
await p.getByRole("button", { name: "Continue" }).click();
await expect("confirm your place");
await p.getByRole("button", { name: /Join this/ }).click();
await expect("See you there");
await step("joined with confetti");
await p.getByRole("button", { name: /Pick a small role|Done/ }).click();
await expect("Sample Street");
await p.locator('label:has-text("Tidy-up crew") input').check();
await p.getByRole("button", { name: "Save my role" }).click();
await expect("Tidy-up crew — thank you");
await step("confirmed, sees address and took a role");

// 3. Calendar file
const ics = await (await p.request.get(`${BASE}/api/ics/beginner-repair-afternoon-mend3`)).text();
if (!ics.includes("BEGIN:VEVENT") || !ics.includes("Sample Street")) throw new Error("bad ics");
console.log("✓ calendar download includes private address for participant");

// 4. Invite-only: expired link blocked, valid link works.
await p.goto(`${BASE}/a/three-chord-song-circle-song1?i=sampleexpiredtoken`);
await expect("invitation has expired");
await p.goto(`${BASE}/a/three-chord-song-circle-song1?i=sampleinvitetoken`);
await expect("Three-chord song circle");
await step("invitation expiry enforced");

// 5. Circle is private to members.
await p.goto(`${BASE}/c/cir_peck`);
await expect("Circles are private");
await p.goto(`${BASE}/c/cir_mend`);
await expect("Circle chat");
await p.fill("#body", "Hi all! First time — excited 🧵");
await p.getByRole("button", { name: "Send" }).click();
await expect("First time — excited");
await step("member chats in the Circle");

// 6. Adapt: Alex copies the format, publishes → review.
await as("u_alex");
await p.goto(`${BASE}/adapt/beginner-repair-afternoon-mend3`);
await p.getByRole("button", { name: /Copy the format/ }).click();
await p.waitForURL(/\/edit/);
if ((await p.inputValue("#venueAddress")) !== "") throw new Error("address was cloned");
await p.fill("#areaLabel", "Stoke Newington, London");
await p.fill("#venueName", "Stoke Newington Library");
await p.fill("#venueAddress", "9 Test Road");
await step("adapted draft has no private data");
await p.getByRole("button", { name: /Send for review/ }).click();
await p.waitForURL(/\/manage/, { timeout: 8000 }).catch(async () => {
  await p.screenshot({ path: "/tmp/claude-0/-home-user-gys/b43c91a5-773c-5d59-aaaf-69cd28ea83af/scratchpad/shots/fail.png", fullPage: true });
  throw new Error("publish failed: " + (await p.locator('p[role="alert"], p[role="status"]').allInnerTexts()).join(" | "));
});
await expect("With the pilot team");
await step("sent for pilot review");

// 7. Operator approves.
await as("u_ops");
await p.goto(`${BASE}/ops#review`);
await p.locator("article", { hasText: "Stoke Newington" }).getByRole("button", { name: /Approve/ }).click();
await expect("Review saved");
await step("operator approved");

// 8. Maya wraps up a past gathering and repeats.
await as("u_maya");
await p.goto(`${BASE}/plan/act_mend1/wrap`);
await expect("Let's do it again");
await p.getByRole("button", { name: /Plan the next one/ }).click();
await p.waitForURL(/\/edit/);
await expect("lessons carried over");
await step("repeat draft created with lessons");

console.log(errors.length ? `page errors: ${errors.join(" | ")}` : "✓ no page errors");
await b.close();
if (errors.length) process.exit(1);
