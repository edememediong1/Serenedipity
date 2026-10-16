import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeOnboarding, signInAs } from "./helpers";

test.describe("music", () => {
  test("the library plays real audio and keeps playing across pages", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    await page.goto("/app/listen?state=calm");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Playlists" })).toBeVisible();
    // ?state=calm preselects Calm: Slow Tide is listed, Lagos Glass (Clear) isn't.
    await expect(main.getByRole("heading", { name: "Slow Tide" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Lagos Glass" })).toHaveCount(0);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

    await main
      .getByRole("list", { name: "Slow Tide tracks" })
      .getByRole("button", { name: "Play Blue Hour" })
      .click();
    const player = page.getByRole("region", { name: "Now playing" }).filter({ visible: true });
    await expect(player).toContainText("Blue Hour");
    await expect(player.getByRole("button", { name: "Pause Blue Hour" })).toBeVisible();
    // The audio element is really advancing.
    await expect(async () => {
      expect(Number(await player.getByRole("slider").inputValue())).toBeGreaterThan(0);
    }).toPass({ timeout: 10_000 });

    // Next track, then navigate away: music keeps going.
    await player.getByRole("button", { name: "Next track" }).click();
    await expect(player).toContainText("Night Rain");
    await page
      .getByRole("navigation", { name: "App" })
      .filter({ visible: true })
      .getByRole("link", { name: "Focus" })
      .click();
    await expect(
      page
        .getByRole("region", { name: "Now playing" })
        .filter({ visible: true })
        .getByRole("button", { name: "Pause Night Rain" }),
    ).toBeVisible();
  });
});
