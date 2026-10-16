// Dev probe: submits /login, reads the email from Mailpit, follows the link, prints where we land.
import { chromium } from "@playwright/test";
const email = `probe-${Date.now()}@example.com`;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await b.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto("http://localhost:3000/app/focus");
console.log("redirected to:", page.url());
await page.getByRole("textbox", { name: "Email" }).fill(email);
await page.getByRole("button", { name: /Email me a sign-in link/ }).click();
await page.waitForURL("**/auth/check-email");
console.log(
  "check-email text:",
  (await page.getByRole("main").innerText()).slice(0, 120).replace(/\n/g, " | "),
);
await new Promise((r) => setTimeout(r, 1500));
const list = await (
  await fetch(`http://127.0.0.1:54324/api/v1/search?query=to:${encodeURIComponent(email)}`)
).json();
const id = list.messages?.[0]?.ID;
const msg = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${id}`)).json();
const link = msg.HTML.match(/href="([^"]*token_hash[^"]*)"/)?.[1]?.replace(/&amp;/g, "&");
console.log("subject:", msg.Subject, "| link:", link);
await page.goto(link);
await page.waitForLoadState("networkidle");
console.log("landed:", page.url());
console.log("errors:", errors);
await b.close();
