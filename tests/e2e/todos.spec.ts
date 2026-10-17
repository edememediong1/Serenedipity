import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeOnboarding, setProfile, signInAs } from "./helpers";

test.describe("to-dos", () => {
  test("add tasks with times, tick them off, retime and remove", async ({ page }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);
    await setProfile(userId, { timezone: "UTC" });
    await page.goto("/app");
    const main = page.getByRole("main");
    const card = main.getByRole("form", { name: "Your to-dos" });
    const list = main.getByRole("list", { name: "Today's tasks" });

    const add = async (title: string, time?: string) => {
      await expect(async () => {
        await card.getByLabel("Add a task").fill(title);
        await expect(card.getByLabel("Add a task")).toHaveValue(title, { timeout: 500 });
      }).toPass();
      if (time) await card.getByLabel(/Time/).fill(time);
      await card.getByRole("button", { name: "Add task" }).click();
      await expect(list.getByText(title)).toBeVisible();
    };
    await add("Email the client");
    await add("Late review", "23:58");
    await add("Morning stand-up", "00:01");

    // Timed tasks first, in time order; the 00:01 one is already past due.
    const titles = await list.locator("li label > span:first-child").allTextContents();
    expect(titles).toEqual(["Morning stand-up", "Late review", "Email the client"]);
    await expect(list.getByText("12:01 AM · past due")).toBeVisible();
    await expect(list.getByText(/^11:58 PM/)).toBeVisible();
    await expect(main.getByText("3 open · about 75 min")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

    // Tick one off: it moves to the bottom with the time it was done.
    await list.getByRole("checkbox", { name: /Email the client/ }).click();
    await expect(list.getByText(/Done at \d{1,2}:\d{2} (AM|PM)/)).toBeVisible();

    // Change a time.
    await list.getByRole("button", { name: "Options for Late review" }).click();
    await page.getByRole("menuitem", { name: "Change time" }).click();
    await list.getByLabel("Time for Late review").fill("23:30");
    await list.getByRole("button", { name: "Save" }).click();
    await expect(list.getByText("11:30 PM")).toBeVisible();

    // Delete one.
    await list.getByRole("button", { name: "Options for Morning stand-up" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(list.getByText("Morning stand-up")).toHaveCount(0);

    // The focus timer picks up today's open tasks.
    await page.goto("/app/focus");
    await expect(page.getByRole("main").getByText("Late review").first()).toBeVisible();
  });
});
