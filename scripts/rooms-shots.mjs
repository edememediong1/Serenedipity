// Dev helper: two people join a focus room (one in focus, one on break) and we screenshot it.
// node scripts/rooms-shots.mjs <width> [focus|break]
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const width = Number(process.argv[2] ?? 375);
const mode = process.argv[3] ?? "focus";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function user(name, plan) {
  const email = `${name.toLowerCase()}-${Date.now()}@example.com`;
  const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const now = new Date().toISOString();
  await admin
    .from("profiles")
    .update({
      display_name: name,
      plan,
      age_confirmed: true,
      age_confirmed_at: now,
      onboarding_step: 6,
      onboarding_completed_at: now,
      timezone: "UTC",
    })
    .eq("id", data.user.id);
  return { id: data.user.id, token: data.properties.hashed_token };
}

const { data: track } = await admin.from("tracks").select("id").eq("slug", "glass-hours").single();
const offset = mode === "break" ? 26 : 9;
const { data: room } = await admin
  .from("rooms")
  .insert({
    title: "Deep work sprint",
    description: "25 on, 5 off, twice.",
    schedule: "once",
    starts_at: new Date(Date.now() - offset * 60_000).toISOString(),
    session_minutes: 55,
    focus_minutes: 25,
    break_minutes: 5,
    track_id: track.id,
  })
  .select("id")
  .single();

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const people = [await user("Ada", "premium"), await user("Tomi", "free"), await user("Jun", "free")];
const pages = [];
for (const [i, p] of people.entries()) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", i, e.message));
  page.on("console", (m) => m.type() === "error" && console.log("console", i, m.text()));
  await page.goto(`${base}/auth/callback?token_hash=${p.token}&type=email&next=/app/rooms/${room.id}`);
  await page.getByRole("button", { name: "Join room" }).click();
  await page.getByRole("button", { name: "Leave room" }).waitFor();
  pages.push(page);
}
await pages[0].waitForTimeout(2500);
if (mode === "break") {
  await pages[1].getByLabel("Message the room").fill("Stretch break. How's everyone doing?");
  await pages[1].getByRole("button", { name: "Send message" }).click();
  await pages[0].getByText("Stretch break").waitFor();
}
await pages[0].getByRole("heading", { name: "Break chat" }).scrollIntoViewIfNeeded();
await pages[0].screenshot({
  path: `/tmp/claude-0/-home-user-serenedipity/8812168e-81a5-5f87-9fac-4884acd37683/scratchpad/room-${mode}-${width}-view.png`,
});
await pages[0].screenshot({
  path: `/tmp/claude-0/-home-user-serenedipity/8812168e-81a5-5f87-9fac-4884acd37683/scratchpad/room-${mode}-${width}.png`,
  fullPage: true,
});
await pages[0].goto(`${base}/app/rooms`);
await pages[0].getByRole("heading", { name: "Live now" }).waitFor();
await pages[0].screenshot({
  path: `/tmp/claude-0/-home-user-serenedipity/8812168e-81a5-5f87-9fac-4884acd37683/scratchpad/rooms-list-${width}.png`,
  fullPage: true,
});
await browser.close();
console.log("done", room.id);
