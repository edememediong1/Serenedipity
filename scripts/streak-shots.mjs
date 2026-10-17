// Dev helper: seeds ~5 months of focus history and screenshots the streak card, grid and celebration.
// node scripts/streak-shots.mjs <width> <outDir>
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const width = Number(process.argv[2] ?? 375);
const out = process.argv[3] ?? ".";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: `streak-${Date.now()}@example.com`,
});
const uid = data.user.id;
const now = new Date();
await admin
  .from("profiles")
  .update({
    display_name: "Ada",
    age_confirmed: true,
    age_confirmed_at: now.toISOString(),
    onboarding_step: 6,
    onboarding_completed_at: now.toISOString(),
    timezone: "UTC",
  })
  .eq("id", uid);
// Deterministic pseudo-random history; the last 9 days (minus one rest day) form the current streak.
let seed = 11;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const blocks = [];
for (let n = 150; n >= 1; n--) {
  const active = n <= 9 ? n !== 4 : rand() < 0.55;
  if (!active) continue;
  const count = 1 + Math.floor(rand() * 4);
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - n);
    d.setUTCHours(8 + i * 2, 0, 0, 0);
    blocks.push({
      user_id: uid,
      planned_minutes: 25,
      started_at: d.toISOString(),
      ended_at: d.toISOString(),
      focused_seconds: 1500,
      completed: true,
      outcome: "done",
    });
  }
}
await admin.from("focus_blocks").insert(blocks);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await (await b.newContext({ viewport: { width, height: 900 } })).newPage();
p.on("pageerror", (e) => console.log("pageerror", e.message));
p.on("console", (m) => m.type() === "error" && console.log("console", m.text().slice(0, 300)));
await p.goto(`${base}/auth/callback?token_hash=${data.properties.hashed_token}&type=email&next=/app`);
await p.getByText("day streak").first().waitFor();
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/s-home-${width}.png` });
await p.goto(`${base}/app/review#activity`);
await p.getByRole("heading", { name: "Your activity" }).waitFor();
await p.getByRole("heading", { name: "Your activity" }).scrollIntoViewIfNeeded();
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/s-grid-${width}.png` });
await p.evaluate(() =>
  window.dispatchEvent(
    new CustomEvent("serenedipity:streak-extended", { detail: { extended: true, current: 9, best: 12 } }),
  ),
);
await p.waitForTimeout(1600);
await p.screenshot({ path: `${out}/s-celebrate-${width}.png` });
await b.close();
