import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeOnboarding, seedBlocks, setProfile, signInAs } from "./helpers";

test.describe("streaks", () => {
  test("home card, activity grid with keyboard, and the rest-day setting", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    // Strict mode keeps the arithmetic simple: yesterday and the two days before make 3.
    await setProfile(userId, { timezone: "UTC", streak_rest_days: 0 });
    await seedBlocks(userId, [1, 2, 3, 7, 40]);

    await page.goto("/app");
    const main = page.getByRole("main");
    await expect(main.getByText("3 day streak")).toBeVisible();
    await expect(main.getByText("Your 3-day streak needs a block today.")).toBeVisible();
    await expect(main.getByRole("list", { name: "This week" })).toBeVisible();
    let results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

    await main.getByRole("link", { name: "Your activity" }).click();
    await expect(main.getByRole("heading", { name: "Your activity" })).toBeVisible();
    const grid = main.getByRole("grid", { name: /Activity over the last 26 weeks: 5 active days/ });
    await expect(grid).toBeVisible();
    // Arrow keys move through days; the detail line follows.
    await grid.focus();
    await expect(main.locator("#activity-detail")).toContainText("no focus time");
    await page.keyboard.press("ArrowLeft"); // same weekday, a week ago
    await expect(main.locator("#activity-detail")).toContainText("1 block · 25 min");
    results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

    await expect(main.getByText("Strict mode: every day counts.")).toBeVisible();

    // Switch to gentle: rest days are explained on Review.
    await page.goto("/app/settings#streaks");
    await main.getByRole("radio", { name: /Gentle/ }).click();
    await expect(main.getByText("Saved.")).toBeVisible();
    await page.goto("/app/review#activity");
    await expect(main.getByText("Up to 2 missed days a week won't break your streak.")).toBeVisible();
  });

  test("finishing the first block of the day celebrates once", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    await setProfile(userId, { timezone: "UTC" });
    await seedBlocks(userId, [1, 2]);

    await page.clock.install();
    await page.goto("/app/focus", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    const what = main.getByRole("textbox", { name: /What are you working on/ });
    await expect(async () => {
      await what.fill("Revise chapter 2");
      await expect(what).toHaveValue("Revise chapter 2", { timeout: 500 });
    }).toPass();
    await main.getByRole("button", { name: "Start focus" }).click();
    await page.clock.fastForward(25 * 60_000 + 1000);
    await main.getByRole("button", { name: "Done" }).first().click();

    const dialog = page.getByRole("dialog", { name: "3-day streak" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Your longest streak yet")).toBeVisible();
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    await dialog.getByRole("button", { name: "Keep going" }).click();
    await expect(dialog).toBeHidden();

    // Home now shows today as done.
    await page.goto("/app");
    await expect(page.getByRole("main").getByText("Today counts. Nice work.")).toBeVisible();
  });
});
