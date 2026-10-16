// Dev helper: walks a mocked Luna check-in and screenshots the plan and focus screens. node scripts/luna-shots.mjs <width>
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const width = Number(process.argv[2] ?? 375);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: `luna-${Date.now()}@example.com`,
});
const now = new Date().toISOString();
await admin
  .from("profiles")
  .update({
    display_name: "Ada",
    age_confirmed: true,
    age_confirmed_at: now,
    ai_guide_consent: true,
    ai_guide_consent_at: now,
    onboarding_step: 6,
    onboarding_completed_at: now,
    timezone: "America/New_York",
  })
  .eq("id", data.user.id);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await b.newPage({ viewport: { width, height: width < 500 ? 812 : 900 } });
await page.goto(
  `http://localhost:3000/auth/callback?token_hash=${data.properties.hashed_token}&type=email&next=/app/check-in`,
);
await page.waitForLoadState("networkidle");
const main = page.getByRole("main");
await main
  .getByRole("textbox", { name: "Or type it" })
  .fill(
    "I woke up foggy and stressed. I have to finish the client report by 5 today and I don't know where to start.",
  );
await main.getByRole("button", { name: "Send" }).click();
await main.getByRole("heading", { name: "Today's plan" }).waitFor();
await page.waitForTimeout(800);
await page.screenshot({ path: `/tmp/claude-0/shots/luna_plan_${width}.png`, fullPage: true });
await main
  .getByRole("button", { name: "Start my first block" })
  .or(main.getByRole("button", { name: "Skip the reset" }))
  .first()
  .click();
await page.waitForURL(/focus/);
await page.waitForTimeout(1200);
await page.screenshot({ path: `/tmp/claude-0/shots/luna_focus_${width}.png`, fullPage: true });
await b.close();
console.log("ok");
