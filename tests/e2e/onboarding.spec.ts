import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { getProfile, signInAs } from "./helpers";

test.describe("onboarding", () => {
  test("happy path saves every step and ends on /app", async ({ page }) => {
    const { userId } = await signInAs(page);
    await expect(page).toHaveURL(/\/onboarding\/welcome$/);

    // 1. Welcome
    await expect(page.getByRole("heading", { level: 1 })).toContainText("set up your space");
    await page.getByRole("textbox", { name: "What should we call you?" }).fill("Ada");
    await page.getByRole("button", { name: "Continue" }).click();

    // 2. Age
    await expect(page).toHaveURL(/\/onboarding\/age$/);
    await page.getByRole("radio", { name: "Yes, I'm 18 or older" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // 3. Goals (validation, then choose)
    await expect(page).toHaveURL(/\/onboarding\/goals$/);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Pick at least one");
    await page.getByRole("button", { name: "Deep work" }).click();
    await page.getByRole("button", { name: "Studying" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // 4. Rhythm (keyboard: arrow keys move through the radiogroup)
    await expect(page).toHaveURL(/\/onboarding\/rhythm$/);
    await page.getByRole("radio", { name: "Morning" }).click();
    await page.getByRole("radio", { name: "25 min" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "50 min" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("50 minutes of focus, then a 10-minute break.")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // 5. Sound
    await expect(page).toHaveURL(/\/onboarding\/sound$/);
    await page.getByRole("button", { name: "Piano" }).click();
    await page.getByRole("button", { name: "Lofi" }).click();
    await page.getByRole("radio", { name: "Yes" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // 6. Focus guide consent is required
    await expect(page).toHaveURL(/\/onboarding\/guide$/);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("confirm");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continue" }).click();

    // 7. Summary
    await expect(page).toHaveURL(/\/onboarding\/done$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ada");
    await expect(page.getByText("Deep work, Studying")).toBeVisible();
    await page.getByRole("button", { name: "Go to my space" }).click();
    await expect(page).toHaveURL(/\/app$/);

    const profile = await getProfile(userId);
    expect(profile).toMatchObject({
      display_name: "Ada",
      age_confirmed: true,
      goals: ["deep-work", "studying"],
      work_style: "morning",
      default_focus_minutes: 50,
      default_break_minutes: 10,
      music_prefs: ["piano", "lofi"],
      has_headphones: true,
      ai_guide_consent: true,
      onboarding_step: 6,
    });
    expect(profile.ai_guide_consent_at).not.toBeNull();
    expect(profile.onboarding_completed_at).not.toBeNull();

    // Finished users can't go back into onboarding or the auth screens.
    await page.goto("/onboarding/goals");
    await expect(page).toHaveURL(/\/app$/);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/app$/);
  });

  test("resumes at the step reached, and skipping works on optional steps", async ({ page }) => {
    await signInAs(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("radio", { name: "Yes, I'm 18 or older" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/onboarding\/goals$/);
    await page.getByRole("button", { name: "Skip for now" }).click();
    await expect(page).toHaveURL(/\/onboarding\/rhythm$/);

    // Leave and come back: land where we stopped. Skipping ahead is not allowed.
    await page.goto("/app");
    await expect(page).toHaveURL(/\/onboarding\/rhythm$/);
    await page.goto("/onboarding/done");
    await expect(page).toHaveURL(/\/onboarding\/rhythm$/);
    // Going back is fine.
    await page.getByRole("link", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/onboarding\/goals$/);
  });

  test("under-18 users are kindly stopped", async ({ page }) => {
    await signInAs(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("radio", { name: "No, I'm under 18" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/onboarding\/not-available$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Not quite yet");
    await page.goto("/app");
    await expect(page).toHaveURL(/\/onboarding\/not-available$/);
  });

  test("every step has no detectable accessibility violations", async ({ page }) => {
    const scan = async (heading: RegExp) => {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      // Let the step's fade-in finish so contrast is measured at full opacity.
      await page.waitForFunction(() =>
        document
          .getAnimations()
          .every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
      );
      const results = await new AxeBuilder({ page }).include("main").analyze();
      expect(results.violations.map((v) => `${page.url()} ${v.id}: ${v.nodes.length}`)).toEqual([]);
    };
    await signInAs(page);
    await scan(/set up your space/);
    await page.getByRole("button", { name: "Continue" }).click();
    await scan(/18 or older/);
    await page.getByRole("radio", { name: "Yes, I'm 18 or older" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    for (const heading of [/brings you here/, /Find your rhythm/, /Choose your sound/]) {
      await scan(heading);
      await page.getByRole("button", { name: "Skip for now" }).click();
    }
    await scan(/Meet your focus guide/);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continue" }).click();
    await scan(/Your space is ready/);
  });
});
