// Dev helper: screenshots the to-do card, voice chat toggle and room allowance. node scripts/todo-shots.mjs <width> <outDir>
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const width = Number(process.argv[2] ?? 375);
const out = process.argv[3] ?? ".";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: `todo-${Date.now()}@example.com`,
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
    timezone: "UTC",
  })
  .eq("id", data.user.id);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await (await b.newContext({ viewport: { width, height: 900 } })).newPage();
p.on("pageerror", (e) => console.log("pageerror", e.message));
await p.goto(`${base}/auth/callback?token_hash=${data.properties.hashed_token}&type=email&next=/app`);
const form = p.getByRole("form", { name: "Your to-dos" });
for (const [title, time] of [
  ["Morning stand-up", "09:00"],
  ["Draft the findings", "14:30"],
  ["Email the client", ""],
]) {
  await form.getByLabel("Add a task").fill(title);
  if (time) await form.getByLabel(/Time/).fill(time);
  await form.getByRole("button", { name: "Add task" }).click();
  await p.getByRole("list", { name: "Today's tasks" }).getByText(title).waitFor();
}
await p.getByRole("checkbox", { name: /Morning stand-up/ }).click();
await p.waitForTimeout(800);
await p.getByRole("heading", { name: "Your to-dos" }).scrollIntoViewIfNeeded();
await p.screenshot({ path: `${out}/t-todos-${width}.png` });
await p.goto(`${base}/app/check-in`);
await p.getByRole("button", { name: "Voice chat off" }).click();
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/t-voice-${width}.png` });
await p.goto(`${base}/app/rooms`);
await p.waitForTimeout(1000);
await p.screenshot({ path: `${out}/t-rooms-${width}.png` });
await b.close();
