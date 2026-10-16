import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeOnboarding, signInAs } from "./helpers";

test.describe("focus timer", () => {
  test.beforeEach(async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId, "Ada");
  });

  test("runs a block, survives time passing, and records it on Today", async ({ page }) => {
    await page.clock.install();
    await page.goto("/app/focus", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    const what = main.getByRole("textbox", { name: /What are you working on/ });
    await expect(async () => {
      await what.fill("Write the intro");
      await expect(what).toHaveValue("Write the intro", { timeout: 500 });
    }).toPass();
    await main.getByRole("button", { name: "Start focus" }).click();
    await expect(main.getByRole("button", { name: "Pause" })).toBeVisible();

    // Pause and resume keep time.
    await page.clock.fastForward(60_000);
    await main.getByRole("button", { name: "Pause" }).click();
    await page.clock.fastForward(5 * 60_000);
    await expect(main.getByRole("progressbar", { name: "Focus timer" })).toHaveAttribute(
      "aria-valuetext",
      "24:00 remaining",
    );
    await main.getByRole("button", { name: "Resume" }).click();

    // Time's up: the between-blocks check appears.
    await page.clock.fastForward(24 * 60_000 + 1000);
    await expect(main.getByText("Block finished. How did it go?")).toBeVisible();
    await main.getByRole("button", { name: "Done" }).first().click();
    await expect(main.getByText("1 lap done. Nice work.")).toBeVisible();
    await expect(main.getByRole("heading", { level: 1 })).toContainText("Breathe, stretch, look away");

    await page.goto("/app", { waitUntil: "networkidle" });
    const today = page.getByRole("main").getByText("Blocks done").locator("..");
    await expect(today).toContainText("1");
    await expect(page.getByRole("main").getByText("1 block done. Nice work.")).toBeVisible();
  });

  test("I'm stuck offers a smaller next step from Luna", async ({ page }) => {
    await page.goto("/app/focus", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    const what = main.getByRole("textbox", { name: /What are you working on/ });
    await expect(async () => {
      await what.fill("Budget review");
      await expect(what).toHaveValue("Budget review", { timeout: 500 });
    }).toPass();
    await main.getByRole("button", { name: "Start focus" }).click();
    await main.getByRole("button", { name: "I'm stuck" }).click();
    await main.getByRole("button", { name: "Ask Luna" }).click();
    await expect(main.getByText('Write three rough bullet points for "Budget review"')).toBeVisible();
    await main.getByRole("button", { name: "Try this for 10 min" }).click();
    await expect(main.getByRole("heading", { level: 1 })).toContainText("Write three rough bullet points");
    await expect(main.getByText("of 10 minutes")).toBeVisible();
  });

  test("focus and check-in pages have no detectable accessibility violations", async ({ page }) => {
    for (const path of ["/app/focus", "/app/check-in", "/app/support"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      await page.waitForFunction(() =>
        document
          .getAnimations()
          .every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
      );
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map((v) => `${path} ${v.id}: ${v.nodes.length}`)).toEqual([]);
    }
  });
});
