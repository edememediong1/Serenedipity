import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeOnboarding, signInAs } from "./helpers";

test.describe("games", () => {
  test.describe.configure({ timeout: 60_000 });
  test("hub and each calm game work and pass axe", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    await page.goto("/app/games");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /Rest your/ })).toBeVisible();
    for (const name of ["Breathing bubble", "Memory match", "Zen tiles", "Word of the day"])
      await expect(main.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    let results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

    // Memory match: flipping a card reveals it.
    await page.goto("/app/games/memory-match");
    await expect(page.getByRole("main").getByRole("heading", { name: "Memory match" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Card 1, face down" }).click();
    await expect(page.getByRole("button", { name: /^Card 1: / })).toBeVisible();

    // Zen tiles: some tile can move.
    await page.goto("/app/games/zen-tiles");
    // Tiles unlock once the puzzle is shuffled in the browser.
    const movable = page.getByRole("button", { name: /can move/ }).and(page.locator(":enabled")).first();
    await expect(movable).toBeVisible({ timeout: 15_000 });
    await movable.click();
    await expect(page.getByRole("status")).toContainText(/Tap a tile|In order again/);

    // Word of the day: type a guess with the keyboard and get feedback.
    await page.goto("/app/games/word-of-the-day");
    await expect(page.getByRole("grid", { name: "Guesses" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Q", exact: true })).toBeVisible();
    // Wait for hydration: the first letter only lands once the keyboard handler is attached.
    await expect(async () => {
      await page.getByRole("button", { name: "S", exact: true }).click();
      await expect(page.getByRole("gridcell", { name: "S", exact: true })).toBeVisible({ timeout: 500 });
    }).toPass();
    await page.keyboard.type("tone");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("gridcell", { name: /^S, / })).toBeVisible();
    results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

    // Breathing bubble starts and stops.
    await page.goto("/app/games/breathing-bubble");
    await page.getByRole("button", { name: "Start breathing" }).click();
    await expect(page.getByText("First breath")).toBeVisible();
    await page.getByRole("button", { name: "Stop" }).click();
  });
});
