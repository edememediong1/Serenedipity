// Dev helper: plays music from Home and Listen and screenshots the player. node scripts/music-shots.mjs <width> <outDir>
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const width = Number(process.argv[2] ?? 375);
const out = process.argv[3] ?? ".";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: `music-${Date.now()}@example.com`,
});
const now = new Date().toISOString();
await admin
  .from("profiles")
  .update({
    display_name: "Ada",
    age_confirmed: true,
    age_confirmed_at: now,
    onboarding_step: 6,
    onboarding_completed_at: now,
  })
  .eq("id", data.user.id);
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const p = await (await b.newContext({ viewport: { width, height: 900 } })).newPage();
p.on("pageerror", (e) => console.log("pageerror", e.message));
p.on("console", (m) => m.type() === "error" && console.log("console", m.text()));
await p.goto(`${base}/auth/callback?token_hash=${data.properties.hashed_token}&type=email&next=/app`);
await p.getByRole("button", { name: "Play Lagos Glass" }).click();
await p.waitForTimeout(4000);
const pos = await p.evaluate(() => [...document.querySelectorAll("input[type=range]")].map((i) => i.value));
console.log("seek values after 4s", pos);
await p.screenshot({ path: `${out}/m-home-${width}.png`, fullPage: true });
await p.goto(`${base}/app/listen`);
await p.waitForTimeout(2000);
await p.screenshot({ path: `${out}/m-listen-${width}.png`, fullPage: true });
await b.close();
