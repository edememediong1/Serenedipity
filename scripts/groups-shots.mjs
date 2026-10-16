// Dev helper: a Pro user creates a group and posts, a second user joins and comments; screenshots.
// node scripts/groups-shots.mjs <width> <outDir>
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const width = Number(process.argv[2] ?? 375);
const out = process.argv[3] ?? ".";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
async function person(name, plan) {
  const { data } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}@example.com`,
  });
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
  return data;
}
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
async function page(d, next) {
  const p = await (await b.newContext({ viewport: { width, height: 900 } })).newPage();
  p.on("pageerror", (e) => console.log("pageerror", e.message));
  p.on("console", (m) => m.type() === "error" && console.log("console", m.text().slice(0, 200)));
  await p.goto(`${base}/auth/callback?token_hash=${d.properties.hashed_token}&type=email&next=${next}`);
  return p;
}
const ada = await page(await person("Ada Obi", "premium"), "/app/groups/new");
await ada.getByLabel("Group name").fill(`Med school finals ${Date.now() % 1000}`);
await ada
  .getByLabel(/What.s it for/)
  .fill("Daily accountability for final-year med students. Share what you're revising and focus together.");
await ada.getByRole("radio", { name: /Exams/ }).click();
await ada.getByRole("button", { name: "Create group" }).click();
await ada.getByRole("button", { name: "Post", exact: true }).waitFor();
await ada
  .getByRole("textbox", { name: "Write a post" })
  .fill("Welcome! Post your plan for today and a win when you finish. Group room every morning at 9.");
await ada.getByRole("button", { name: "Post", exact: true }).click();
await ada.getByText("Posted.").waitFor();
await ada.getByRole("radio", { name: "Question" }).click();
await ada
  .getByRole("textbox", { name: "Write a post" })
  .fill("Anyone have a good way to memorise the brachial plexus?");
await ada.getByRole("button", { name: "Post", exact: true }).click();
await ada.getByText("Posted.").waitFor();
const slug = ada.url().split("/groups/")[1].split("?")[0];
const tomi = await page(await person("Tomi", "free"), `/app/groups/${slug}`);
await tomi.getByRole("button", { name: "Join group" }).click();
await tomi.getByRole("button", { name: "Post", exact: true }).waitFor();
await tomi
  .getByRole("button", { name: /React fire/ })
  .first()
  .click();
await tomi.getByRole("button", { name: "Comment", exact: true }).first().click();
await tomi
  .getByLabel("Write a comment")
  .first()
  .fill("Randy Travis Drinks Cold Beer: roots, trunks, divisions, cords, branches!");
await tomi.getByRole("button", { name: "Send" }).first().click();
await tomi.waitForTimeout(1500);
await ada.reload();
await ada.getByText("Randy Travis").waitFor();
await ada.waitForTimeout(800);
await ada.screenshot({ path: `${out}/gr-feed-${width}.png`, fullPage: true });
await ada.goto(`${base}/app/groups/${slug}?tab=members`);
await ada.waitForTimeout(1000);
await ada.screenshot({ path: `${out}/gr-members-${width}.png` });
await tomi.goto(`${base}/app/groups`);
await tomi.waitForTimeout(1000);
await tomi.screenshot({ path: `${out}/gr-list-${width}.png`, fullPage: true });
await b.close();
console.log("ok", slug);
