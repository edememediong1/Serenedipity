// Dev helper: signs in an onboarded user and screenshots app routes. node scripts/app-shots.mjs <width> [paths...]
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const [w = "375", ...paths] = process.argv.slice(2);
const width = Number(w);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const email = `app-${Date.now()}@example.com`;
const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email });
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
    goals: ["deep-work"],
    music_prefs: ["jazz"],
    timezone: "America/New_York",
  })
  .eq("id", data.user.id);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await b.newPage({ viewport: { width, height: width < 500 ? 812 : 900 } });
const errors = [];
page.on(
  "console",
  (m) => (m.type() === "error" || m.type() === "warning") && errors.push(m.text().slice(0, 200)),
);
await page.goto(
  `http://localhost:3000/auth/callback?token_hash=${data.properties.hashed_token}&type=email&next=/app`,
);
for (const p of paths.length ? paths : ["/app"]) {
  await page.goto("http://localhost:3000" + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const out = `/tmp/claude-0/shots/app${p.replace(/[^a-z0-9]+/gi, "_")}_${width}.png`;
  await page.screenshot({ path: out, fullPage: process.env.FULL === "1" });
  const hs = await page.evaluate(() => {
    window.scrollTo(200, window.scrollY);
    const x = window.scrollX;
    window.scrollTo(0, window.scrollY);
    return x > 0;
  });
  console.log(out, page.url(), "hscroll=" + hs);
}
console.log("errors:", errors);
await b.close();
