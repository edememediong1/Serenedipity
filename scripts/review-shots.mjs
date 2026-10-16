// Dev helper: seeds a week of focus history for a test user and screenshots Review. node scripts/review-shots.mjs <width>
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const width = Number(process.argv[2] ?? 375);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: `review-${Date.now()}@example.com`,
});
const uid = data.user.id;
const now = new Date();
await admin
  .from("profiles")
  .update({
    display_name: "Ada",
    plan: "premium",
    age_confirmed: true,
    age_confirmed_at: now.toISOString(),
    ai_guide_consent: true,
    onboarding_step: 6,
    onboarding_completed_at: now.toISOString(),
    timezone: "UTC",
  })
  .eq("id", uid);
const day = (n, h) => {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(h, 0, 0, 0);
  return d.toISOString();
};
const titles = [
  "Outline the report",
  "Draft findings",
  "Add charts",
  "Proofread and send",
  "Email the client",
  "Plan next sprint",
];
for (const n of [6, 5, 4, 2, 1]) {
  const { data: plan } = await admin
    .from("plans")
    .insert({ user_id: uid, created_at: day(n, 8), status: "completed" })
    .select("id")
    .single();
  const k = 3 + (n % 2);
  await admin.from("tasks").insert(
    Array.from({ length: k }, (_, i) => ({
      plan_id: plan.id,
      user_id: uid,
      title: titles[(i + n) % titles.length],
      estimate_minutes: 25,
      position: i,
      created_at: day(n, 8),
      status: i < k - (n === 1 ? 2 : 1) ? "done" : "todo",
    })),
  );
  const blocks = Array.from({ length: n === 1 ? 4 : 2 + (n % 3) }, (_, i) => ({
    user_id: uid,
    task_title: titles[(i + n) % titles.length],
    planned_minutes: 25,
    started_at: day(n, 9 + i),
    ended_at: day(n, 9 + i),
    focused_seconds: (20 + ((i * 7) % 6)) * 60,
    completed: i % 4 !== 3,
    outcome: i % 4 === 3 ? "stuck" : "done",
    technique: n % 2 ? "pomodoro" : "deep-work",
  }));
  await admin.from("focus_blocks").insert(blocks);
}
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await b.newPage({ viewport: { width, height: width < 500 ? 812 : 900 } });
await page.goto(
  `http://localhost:3000/auth/callback?token_hash=${data.properties.hashed_token}&type=email&next=/app/review`,
);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(800);
await page.screenshot({ path: `/tmp/claude-0/shots/review_day_${width}.png`, fullPage: true });
await page.goto("http://localhost:3000/app/review?view=week", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Ask Luna to reflect/ }).click();
await page.getByText("For next week").waitFor();
await page.waitForTimeout(600);
await page.screenshot({ path: `/tmp/claude-0/shots/review_week_${width}.png`, fullPage: true });
await page.goto("http://localhost:3000/app", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: `/tmp/claude-0/shots/review_home_${width}.png` });
await b.close();
console.log("ok");
