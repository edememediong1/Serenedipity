// Dev helper: signs in a fresh user and screenshots each onboarding step at the given width.
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const width = Number(process.argv[2] ?? 375);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: `shots-${Date.now()}@example.com`,
});
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await b.newPage({ viewport: { width, height: width < 500 ? 812 : 900 } });
await page.goto(
  `http://localhost:3000/auth/callback?token_hash=${data.properties.hashed_token}&type=email&next=/app`,
);
const shot = async (n) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/tmp/claude-0/shots/ob_${n}_${width}.png` });
};
await shot("welcome");
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForURL(/age$/);
await page.getByRole("radio").first().click();
await shot("age");
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForURL(/goals$/);
await page.getByRole("button", { name: "Deep work" }).click();
await shot("goals");
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForURL(/rhythm$/);
await page.getByRole("radio", { name: "Evening" }).click();
await shot("rhythm");
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForURL(/sound$/);
await page.getByRole("button", { name: "Jazz" }).click();
await shot("sound");
await page.getByRole("radio", { name: "Yes" }).click();
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForURL(/guide$/);
await shot("guide");
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForURL(/done$/);
await shot("done");
await b.close();
