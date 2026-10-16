import { expect, test } from "@playwright/test";
import { completeOnboarding, signInAs } from "./helpers";

// These run with LUNA_MOCK=true (deterministic replies; no API calls). See .env.example.
test.describe("check-in with Luna", () => {
  test.beforeEach(async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId, "Ada");
  });

  test("clarify, plan, edit, then start with a reset", async ({ page }) => {
    await page.goto("/app/check-in?mood=foggy", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toContainText("How are you feeling?");
    await expect(main.getByText("not a medical or mental health service")).toBeVisible();

    const box = main.getByRole("textbox", { name: "Or type it" });
    await expect(box).toHaveValue("I'm feeling foggy today. ");
    await box.fill("I woke up foggy and stressed.");
    await main.getByRole("button", { name: "Send" }).click();

    // Turn 1: Luna asks clarifying questions.
    await expect(main.getByText("What exactly do you need to finish?")).toBeVisible();
    await main.getByRole("textbox", { name: "Reply to Luna" }).fill("The client report, due by 5 today.");
    await main.getByRole("button", { name: "Send" }).click();

    // Turn 2: a plan.
    await expect(main.getByRole("heading", { name: "Today's plan" })).toBeVisible();
    await expect(main.getByText("Due 5:00 PM")).toBeVisible();
    await expect(main.getByText("Outline the report sections")).toBeVisible();

    // Edit: rename the first task and delete the last.
    await main.getByRole("button", { name: "Edit plan" }).click();
    await main.getByRole("textbox", { name: "Task 1" }).fill("Outline the sections");
    await main.getByRole("button", { name: "Delete task 4" }).click();
    await main.getByRole("button", { name: "Done editing" }).click();
    await expect(main.getByText("Proofread and send")).toHaveCount(0);

    await main.getByRole("button", { name: "Start with a 2-minute reset" }).click();
    await expect(page).toHaveURL(/\/app\/focus\?plan=.+&reset=1$/);
    await expect(main.getByRole("heading", { name: "Breathe with it" })).toBeVisible();
    await main.getByRole("button", { name: "Skip to my first block" }).click();

    await expect(main.getByRole("heading", { level: 1 })).toHaveText("Outline the sections");
    await expect(main.getByText(/Block 1 of 3 · due/)).toBeVisible();
  });

  test("crisis language steps out of planning and shows support", async ({ page }) => {
    await page.goto("/app/check-in", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    await main.getByRole("textbox", { name: "Or type it" }).fill("I can't do this anymore, I want to die");
    await main.getByRole("button", { name: "Send" }).click();
    await expect(main.getByRole("heading", { name: "Talk to someone now" })).toBeVisible();
    await expect(main.getByRole("link", { name: "Call 988" })).toHaveAttribute("href", "tel:988");
    await expect(main.getByRole("heading", { name: "Today's plan" })).toHaveCount(0);
    await expect(main.getByRole("textbox")).toHaveCount(0);
  });

  test("the free plan allows one check-in a day", async ({ page }) => {
    await page.goto("/app/check-in", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    await main.getByRole("textbox", { name: "Or type it" }).fill("Client report due by 5 today");
    await main.getByRole("button", { name: "Send" }).click();
    await expect(main.getByRole("heading", { name: "Today's plan" })).toBeVisible();

    await page.goto("/app/check-in", { waitUntil: "networkidle" });
    await main.getByRole("textbox", { name: "Or type it" }).fill("Another one");
    await main.getByRole("button", { name: "Send" }).click();
    await expect(main.getByText("You've used today's free check-in.")).toBeVisible();
  });
});
