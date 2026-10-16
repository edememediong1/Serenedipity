import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test.describe("authentication", () => {
  test("logged-out visitors are redirected from /app to /login and back after sign-in", async ({ page }) => {
    await page.goto("/app/rooms");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Frooms$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");

    await page.goto("/onboarding/goals");
    await expect(page).toHaveURL(/\/login\?next=%2Fonboarding%2Fgoals$/);
  });

  test("new users land in onboarding after the magic link", async ({ page }) => {
    await signInAs(page, undefined, "/app");
    await expect(page).toHaveURL(/\/onboarding\/welcome$/);
  });

  test("magic link form shows validation and the check-email screen", async ({ page }) => {
    await page.goto("/signup");
    const form = page.getByRole("form", { name: "Sign in with email" });
    await form.getByRole("button", { name: /Email me a sign-in link/ }).click();
    await expect(form.getByRole("alert")).toContainText("Add your email");
  });

  test("expired or reused links show a friendly error", async ({ page }) => {
    await page.goto("/auth/callback?token_hash=not-a-real-token&type=email");
    await expect(page).toHaveURL(/\/auth\/error\?reason=/);
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    await expect(page.getByRole("link", { name: /Send a new link|Back to sign in/ })).toBeVisible();
  });

  test("cancelled OAuth shows the cancelled message", async ({ page }) => {
    await page.goto("/auth/callback?error=access_denied&error_description=cancelled");
    await expect(page.getByRole("main").getByRole("alert")).toContainText("cancelled");
  });
});
