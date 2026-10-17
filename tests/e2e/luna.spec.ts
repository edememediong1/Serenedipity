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
    await expect(main.getByText(/Lap 1 of 3 · due/)).toBeVisible();
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

  test("voice chat reads Luna's replies aloud, with a stop control", async ({ page }) => {
    // Stand in for the speech service with a real (long) audio file, and capture what's spoken.
    const spoken: string[] = [];
    await page.route("**/api/luna/speak", async (route) => {
      spoken.push((route.request().postDataJSON() as { text: string }).text);
      await route.fulfill({ path: "public/audio/slow-tide.mp3", contentType: "audio/mpeg" });
    });
    await page.goto("/app/check-in", { waitUntil: "networkidle" });
    const main = page.getByRole("main");
    const toggle = main.getByRole("button", { name: "Voice chat off" });
    await toggle.click();
    await expect(main.getByRole("button", { name: "Voice chat on" })).toHaveAttribute("aria-pressed", "true");

    await main.getByRole("textbox", { name: "Or type it" }).fill("I feel scattered.");
    await main.getByRole("button", { name: "Send" }).click();
    await expect(
      main.getByText("Thanks for telling me. Let's figure out the shape of it first."),
    ).toBeVisible();
    await expect(main.getByRole("status").filter({ hasText: "Luna is speaking" })).toBeVisible();
    expect(spoken[0]).toContain("What exactly do you need to finish?");
    // Replies can be answered by voice too.
    await expect(main.getByRole("button", { name: "Reply by voice" })).toBeVisible();

    await main.getByRole("button", { name: "Stop" }).click();
    await expect(main.getByText("Luna is speaking")).toHaveCount(0);

    // The preference is remembered.
    await page.reload({ waitUntil: "networkidle" });
    await expect(main.getByRole("button", { name: "Voice chat on" })).toBeVisible();
  });

  test("the speech endpoint needs a session and falls back when voice isn't set up", async ({
    page,
    request,
  }) => {
    const anon = await request.post("/api/luna/speak", { data: { text: "hello" } });
    expect(anon.status()).toBe(401);
    // Signed in (beforeEach) but LUNA_MOCK=true: the app uses the device's own voice.
    const res = await page.request.post("/api/luna/speak", { data: { text: "hello" } });
    expect(res.status()).toBe(501);
    expect((await res.json()).fallback).toBe(true);
  });
});
