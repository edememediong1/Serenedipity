// Dev helper: technique setup on /app/focus, then the running-timer banner on /app. node scripts/timer-shots.mjs <width>
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const width = Number(process.argv[2] ?? 375);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: `timer-${Date.now()}@example.com`,
});
const now = new Date().toISOString();
await admin
  .from("profiles")
  .update({
    display_name: "Ada",
    age_confirmed: true,
    age_confirmed_at: now,
    ai_guide_consent: true,
    onboarding_step: 6,
    onboarding_completed_at: now,
  })
  .eq("id", data.user.id);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await b.newPage({ viewport: { width, height: width < 500 ? 812 : 900 } });
await page.goto(
  `http://localhost:3000/auth/callback?token_hash=${data.properties.hashed_token}&type=email&next=/app/focus`,
);
await page.waitForLoadState("networkidle");
const main = page.getByRole("main");
await main.getByRole("radio", { name: "Deep work" }).click();
await main.getByRole("button", { name: "Fewer laps" }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `/tmp/claude-0/shots/timer_setup_${width}.png`, fullPage: true });
await main.getByRole("textbox", { name: /What are you working on/ }).fill("Write the launch email");
await main.getByRole("button", { name: "Start focus" }).click();
await page.waitForTimeout(1500);
await page
  .getByRole("navigation", { name: "App" })
  .filter({ visible: true })
  .getByRole("link", { name: "Listen" })
  .click();
await page.waitForURL(/\/app$/);
await page.waitForTimeout(1200);
await page.screenshot({ path: `/tmp/claude-0/shots/timer_banner_${width}.png` });
await b.close();
console.log("ok");
