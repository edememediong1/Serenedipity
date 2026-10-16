// Dev helper: node scripts/screenshot.mjs <path> [outDir] [widths]
// Captures full-page screenshots at given widths and prints console errors.
import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";

const [, , path = "/", outDir = "/tmp/claude-0/shots", widthsArg = "375,768,1440"] = process.argv;
const base = process.env.BASE_URL ?? "http://localhost:3000";
const exe = existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const browser = await chromium.launch({ executablePath: exe });
for (const w of widthsArg.split(",").map(Number)) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: w < 500 ? 812 : 900 },
    deviceScaleFactor: 1,
  });
  if (process.env.COOKIES) await ctx.addCookies(JSON.parse(process.env.COOKIES));
  const page = await ctx.newPage();
  const errors = [];
  page.on(
    "console",
    (m) => (m.type() === "error" || m.type() === "warning") && errors.push(`${m.type()}: ${m.text()}`),
  );
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const name = `${outDir}/${path.replace(/[^a-z0-9]+/gi, "_") || "root"}_${w}.png`;
  await page.screenshot({ path: name, fullPage: process.env.FULL !== "0" });
  const overflow = await page.evaluate(() => {
    window.scrollTo(200, window.scrollY);
    const x = window.scrollX;
    window.scrollTo(0, window.scrollY);
    return x > 0;
  });
  console.log(`${name}  url=${page.url()}  hscroll=${overflow}  errors=${errors.length}`);
  errors.forEach((e) => console.log("   ", e.slice(0, 300)));
  await ctx.close();
}
await browser.close();
