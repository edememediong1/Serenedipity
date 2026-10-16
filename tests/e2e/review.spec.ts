import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeOnboarding, seedDay, setProfile, signInAs } from "./helpers";

test.describe("review", () => {
  test("yesterday's tasks, timeline and the 'did you finish?' nudge", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    await setProfile(userId, { timezone: "UTC" });
    await seedDay(userId, 1, [
      { title: "Outline the report", status: "done" },
      { title: "Send the invoice", status: "todo" },
    ]);
    await seedDay(userId, 3, [{ title: "Plan the week", status: "done" }], 3);

    // Home: Luna asks about the unticked task.
    await page.goto("/app", { waitUntil: "networkidle" });
    const nudge = page.getByRole("region", { name: /Were you able to finish/ });
    await expect(nudge).toContainText("Send the invoice");

    // Review opens on yesterday.
    await page.goto("/app/review", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    await expect(main.getByText("Yesterday")).toBeVisible();
    await expect(main.getByText("1 of 2")).toBeVisible();
    await expect(main.getByRole("heading", { name: "Timeline" })).toBeVisible();
    await main
      .getByRole("group", { name: 'Did you finish "Send the invoice"?' })
      .getByRole("button", { name: "Yes, done" })
      .click();
    // The page refreshes from the server and the task flips to done.
    await expect(main.getByText("2 of 2")).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await expect(main.getByText("2 of 2")).toBeVisible();

    // Week: analytics and insights; reflection is Pro.
    await main.getByRole("link", { name: "Week" }).click();
    await expect(main.getByRole("heading", { name: "Focus minutes per day" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "What went well" })).toBeVisible();
    await expect(main.getByRole("link", { name: "Upgrade to Pro" })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test("Pro users get Luna's weekly reflection", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    await setProfile(userId, { plan: "premium" });
    await seedDay(userId, 2, [{ title: "Draft", status: "done" }]);
    await page.goto("/app/review?view=week", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    await main.getByRole("button", { name: "Ask Luna to reflect" }).click();
    await expect(main.getByText("For next week")).toBeVisible();
  });

  test("the upgrade page shows Pro", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    await page.goto("/app/upgrade", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toContainText("Go further");
    await expect(main.getByText("$59.99")).toBeVisible();
    await main.getByRole("radio", { name: "Monthly" }).click();
    await expect(main.getByText("$7.99")).toBeVisible();
  });
});
