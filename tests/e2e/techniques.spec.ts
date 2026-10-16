import { expect, test } from "@playwright/test";
import { completeOnboarding, getProfile, signInAs } from "./helpers";

test.describe("techniques, laps and the timer banner", () => {
  test("choose a technique and laps; the banner follows you around the app", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    await page.goto("/app/focus", { waitUntil: "networkidle" });
    const main = page.getByRole("main");

    await main.getByRole("radio", { name: "Deep work" }).click();
    await expect(main.getByText("of 50 minutes")).toBeVisible();
    await main.getByRole("button", { name: "Fewer laps" }).click();
    await main.getByRole("button", { name: "Fewer laps" }).click();
    await expect(main.getByText("Deep work · Lap 1 of 2")).toBeVisible();
    await expect.poll(async () => (await getProfile(userId)).focus_laps).toBe(2);
    expect((await getProfile(userId)).focus_technique).toBe("deep-work");

    await main.getByRole("button", { name: "Start focus" }).click();
    await expect(main.getByRole("button", { name: "Pause" })).toBeVisible();

    await page
      .getByRole("navigation", { name: "App" })
      .filter({ visible: true })
      .getByRole("link", { name: "Check in" })
      .click();
    const banner = page.getByRole("region", { name: "Timer running" });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Lap 1/2");
    await banner.getByRole("button", { name: "Pause timer" }).click();
    await expect(banner).toContainText("Paused");
    await banner.getByRole("link", { name: /Open the timer/ }).click();
    await expect(page).toHaveURL(/\/app\/focus$/);
    await expect(page.getByRole("region", { name: "Timer running" })).toHaveCount(0);
  });

  test("a session ends after its laps", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    await page.clock.install();
    await page.goto("/app/focus", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    await main.getByRole("radio", { name: "Pomodoro" }).click();
    for (let i = 0; i < 3; i++) await main.getByRole("button", { name: "Fewer laps" }).click();
    await expect(main.getByText("Pomodoro · Lap 1 of 1")).toBeVisible();
    await main.getByRole("button", { name: "Start focus" }).click();
    await page.clock.fastForward(25 * 60_000 + 1000);
    await main.getByRole("button", { name: "Done" }).first().click();
    await expect(main.getByRole("heading", { level: 1 })).toContainText("Session complete");
    await expect(main.getByText("All 1 lap done.")).toBeVisible();
  });

  test("flowtime counts up and sizes the break from the block", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    await page.clock.install();
    await page.goto("/app/focus", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    await main.getByRole("radio", { name: "Flowtime" }).click();
    await main.getByRole("button", { name: "Start focus" }).click();
    await page.clock.fastForward(40 * 60_000);
    await expect(main.getByRole("progressbar", { name: "Focus timer" })).toHaveAttribute(
      "aria-valuetext",
      /^40:\d\d focused$/,
    );
    await main.getByRole("button", { name: "Done" }).click();
    await expect(main.getByText("of 8 minutes")).toBeVisible();
  });
});
