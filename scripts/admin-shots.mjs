// Dev helper: signs in as an admin (role=admin) and screenshots admin pages. node scripts/admin-shots.mjs <width>
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const width = Number(process.argv[2] ?? 1440);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: `admin-${Date.now()}@example.com`,
});
const now = new Date().toISOString();
await admin
  .from("profiles")
  .update({
    display_name: "Admin",
    role: "admin",
    age_confirmed: true,
    age_confirmed_at: now,
    ai_guide_consent: true,
    onboarding_step: 6,
    onboarding_completed_at: now,
  })
  .eq("id", data.user.id);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await b.newPage({ viewport: { width, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
await page.goto(
  `http://localhost:3000/auth/callback?token_hash=${data.properties.hashed_token}&type=email&next=/admin`,
);
for (const p of ["/admin", "/admin/users", "/admin/settings"]) {
  await page.goto("http://localhost:3000" + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: `/tmp/claude-0/shots/admin${p.replace(/\//g, "_")}_${width}.png`,
    fullPage: true,
  });
  console.log(p, page.url());
}
console.log("errors", errors);
await b.close();
