// Dev helper: screenshots each game after a few interactions. node scripts/games-shots.mjs <width>
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const width = Number(process.argv[2] ?? 375);
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const out = process.argv[3] ?? ".";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: `games-${Date.now()}@example.com`,
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
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await (await b.newContext({ viewport: { width, height: 900 } })).newPage();
p.on("pageerror", (e) => console.log("pageerror", e.message));
await p.goto(`${base}/auth/callback?token_hash=${data.properties.hashed_token}&type=email&next=/app/games`);
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/g-hub-${width}.png`, fullPage: true });
for (const g of ["memory-match", "zen-tiles", "breathing-bubble", "word-of-the-day"]) {
  await p.goto(`${base}/app/games/${g}`);
  await p.waitForTimeout(2000);
  if (g === "memory-match") {
    for (const n of [1, 2, 3])
      await p
        .getByRole("button", { name: `Card ${n}, face down` })
        .click()
        .catch(() => {});
  }
  if (g === "breathing-bubble") {
    await p.getByRole("button", { name: "Start breathing" }).click();
    await p.waitForTimeout(2500);
  }
  if (g === "word-of-the-day") {
    await p.keyboard.type("stone");
    await p.keyboard.press("Enter");
    await p.waitForTimeout(500);
  }
  await p.screenshot({ path: `${out}/g-${g}-${width}.png`, fullPage: true });
}
await b.close();
