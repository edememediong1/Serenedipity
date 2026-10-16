import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeOnboarding, getProfile, signInAs } from "./helpers";

test.describe("app shell and dashboard", () => {
  test.beforeEach(async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId, "Ada");
    test.info().annotations.push({ type: "userId", description: userId });
    await page.goto("/app");
  });

  test("home shows greeting, check-in, states, picks and today", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toContainText("Find your focus");
    await expect(
      page
        .getByText(/Good (morning|afternoon|evening), Ada/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(main.getByRole("link", { name: "Start a voice check-in" })).toHaveAttribute(
      "href",
      "/app/check-in",
    );
    await expect(main.getByRole("link", { name: /Focus\s*Deep work/ })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Picked for you" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Today" })).toBeVisible();

    // Mock player: playing a mix updates the persistent mini player.
    await main.getByRole("button", { name: "Play Lagos Glass" }).click();
    await expect(page.getByRole("region", { name: "Now playing" }).filter({ visible: true })).toContainText(
      "Lagos Glass",
    );
  });

  test("navigation reaches every main section", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "App" }).filter({ visible: true });
    for (const [label, title] of [
      ["Check in", "How are you feeling?"],
      ["Focus", "One block at a time"],
      ["Rooms", "Focus together"],
    ] as const) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toContainText(title);
      await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    }
    await nav.getByRole("link", { name: "Listen" }).click();
    await expect(page).toHaveURL(/\/app$/);
  });

  test("settings edits the onboarding answers", async ({ page }) => {
    const userId = test.info().annotations.find((a) => a.type === "userId")!.description!;
    await page.goto("/app/settings", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    const name = main.getByRole("textbox", { name: "First name" });
    await expect(name).toHaveValue("Ada");
    await name.fill("Grace");
    await expect(name).toHaveValue("Grace");
    await main.getByRole("button", { name: "Creative work" }).click();
    await main.getByRole("radio", { name: "90 min" }).click();
    await main.getByRole("button", { name: "Save changes" }).click();
    await expect(main.getByText("Saved.")).toBeVisible();
    const profile = await getProfile(userId);
    expect(profile.display_name).toBe("Grace");
    expect(profile.goals).toContain("creative");
    expect(profile.default_focus_minutes).toBe(90);
    expect(profile.default_break_minutes).toBe(20);
  });

  test("sign out from the account menu", async ({ page }) => {
    await page.getByRole("button", { name: "Account menu" }).filter({ visible: true }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
  });

  test("dashboard and settings have no detectable accessibility violations", async ({ page }) => {
    for (const path of ["/app", "/app/settings", "/app/focus"]) {
      await page.goto(path);
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
