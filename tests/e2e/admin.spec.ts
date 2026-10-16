import { expect, test } from "@playwright/test";
import { completeOnboarding, setProfile, setSetting, signInAs } from "./helpers";

test.describe.configure({ mode: "serial" }); // these tests change global settings

test.describe("admin", () => {
  test.afterAll(async () => {
    await setSetting("free_daily_checkins", 1);
  });

  test("non-admins can't reach the admin area", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/app$/);
  });

  test("admins see the dashboard and can change the free check-in limit", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId, "Admin");
    await setProfile(userId, { role: "admin" });

    await page.goto("/admin", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Product health");
    await expect(page.getByText("Pro subscribers")).toBeVisible();

    await page.getByRole("link", { name: "Users" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Everyone");

    await page.goto("/admin/settings", { waitUntil: "networkidle" });
    const free = page.getByRole("textbox", { name: "Free plan" });
    await expect(free).toHaveValue("1");
    await free.fill("2");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved.")).toBeVisible();
  });

  test("the default free plan allows one check-in a day", async ({ page }) => {
    await setSetting("free_daily_checkins", 1);
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
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

  test("free users get the admin-set number of check-ins; admins are never limited", async ({ page }) => {
    await setSetting("free_daily_checkins", 2);
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    const checkIn = async () => {
      await page.goto("/app/check-in", { waitUntil: "networkidle" });
      const main = page.getByRole("main");
      await main.getByRole("textbox", { name: "Or type it" }).fill("Client report due by 5 today");
      await main.getByRole("button", { name: "Send" }).click();
      return main;
    };
    await expect((await checkIn()).getByRole("heading", { name: "Today's plan" })).toBeVisible();
    await expect((await checkIn()).getByRole("heading", { name: "Today's plan" })).toBeVisible();
    await expect((await checkIn()).getByText("You've used today's free 2 check-ins.")).toBeVisible();

    await setProfile(userId, { role: "admin" });
    await expect((await checkIn()).getByRole("heading", { name: "Today's plan" })).toBeVisible();
  });
});
