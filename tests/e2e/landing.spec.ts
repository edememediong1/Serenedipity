import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("renders every section in order", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Clear head.");
    for (const id of ["how-it-works", "features", "focus-together", "pricing", "faq", "waitlist"]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Start free" }).first()).toHaveAttribute("href", "/signup");
    expect(errors).toEqual([]);
  });

  test("pricing toggle switches between monthly and yearly", async ({ page }) => {
    await page.goto("/#pricing");
    const pricing = page.locator("#pricing");
    await expect(pricing.getByText("$59.99")).toBeVisible();
    await pricing.getByRole("radio", { name: "Monthly" }).click();
    await expect(pricing.getByText("$7.99")).toBeVisible();
    await expect(pricing.getByRole("link", { name: "Get Premium" })).toHaveAttribute(
      "href",
      "/signup?plan=premium-monthly",
    );
  });

  test("FAQ answers the mental health question", async ({ page }) => {
    await page.goto("/#faq");
    await page.getByRole("button", { name: "Is this a mental health service?" }).click();
    await expect(page.getByText(/isn't a medical or mental health service/)).toBeVisible();
  });

  test("waitlist form validates and submits", async ({ page }) => {
    await page.goto("/?utm_source=youtube&utm_campaign=e2e");
    const form = page.getByRole("form", { name: "Join the waitlist" });
    await form.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(form.getByRole("alert")).toContainText("Add your email");

    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    await form.getByLabel("Email").fill(email);
    await form.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.getByRole("status")).toContainText("You're on the list");
  });

  test("has no detectable accessibility violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
