import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser } from "@playwright/test";
import {
  archiveRoomForTest,
  completeOnboarding,
  createRoom,
  isBlocked,
  participant,
  setProfile,
  signInAs,
  uniqueEmail,
} from "./helpers";

async function person(
  browser: Browser,
  name: string,
  plan: "free" | "premium" = "free",
  email = uniqueEmail(name.toLowerCase()),
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const { userId } = await signInAs(page, email, "/onboarding");
  await completeOnboarding(userId, name);
  await setProfile(userId, { plan, timezone: "UTC" });
  return { page, userId, email, context };
}

test.describe("focus rooms", () => {
  // Several people sign in per test.
  test.describe.configure({ timeout: 90_000 });
  test("join, see each other, synced timer, break-only chat, report and leave", async ({ browser }) => {
    const room = await createRoom(27); // two minutes into the first break
    const ada = await person(browser, "Ada", "premium");
    const tomi = await person(browser, "Tomi");

    for (const p of [ada, tomi]) {
      await p.page.goto(`/app/rooms/${room.id}`);
      await p.page.getByRole("button", { name: "Join room" }).click();
      await expect(p.page.getByRole("button", { name: "Leave room" })).toBeVisible();
    }
    const main = ada.page.getByRole("main");
    await expect(main.getByText(/Live · 2 people working/)).toBeVisible({ timeout: 15_000 });
    await expect(main.getByText(/Break · back at/)).toBeVisible();
    await expect(main.getByText("Everyone hears:")).toBeVisible();
    await expect(main.getByRole("button", { name: /Tomi: Camera off/ })).toBeVisible();
    // Mic and camera start off; without Agora configured the room says so.
    await expect(main.getByRole("button", { name: "Turn microphone on" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Break chat flows between people.
    await tomi.page.getByLabel("Message the room").fill("Stretch break, anyone?");
    await tomi.page.getByRole("button", { name: "Send message" }).click();
    await expect(main.getByText("Stretch break, anyone?")).toBeVisible();

    const results = await new AxeBuilder({ page: ada.page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

    // Report (and block) Tomi: their messages disappear for Ada.
    await main.getByRole("button", { name: "Report" }).click();
    const sheet = ada.page.getByRole("dialog", { name: "Report someone" });
    await sheet.getByRole("radio", { name: "Harassment or bullying" }).click();
    await sheet.getByRole("button", { name: "Send report" }).click();
    await expect(sheet.getByText("Thanks for telling us")).toBeVisible();
    await sheet.getByRole("button", { name: "Back to the room" }).click();
    await expect(main.getByText("Stretch break, anyone?")).toBeHidden();
    await expect(main.getByRole("button", { name: /Tomi: Blocked/ })).toBeVisible();
    // The block is saved: it still applies after a reload.
    expect(await isBlocked(ada.userId, tomi.userId)).toBe(true);

    await tomi.page.getByRole("button", { name: "Leave room" }).click();
    await expect(tomi.page).toHaveURL(/\/app\/rooms$/);
    expect((await participant(room.id, tomi.userId))?.left_at).not.toBeNull();
    await archiveRoomForTest(room.id);
  });

  test("chat stays closed during the focus block", async ({ browser }) => {
    const room = await createRoom(5);
    const ada = await person(browser, "Ada", "premium");
    await ada.page.goto(`/app/rooms/${room.id}`);
    await ada.page.getByRole("button", { name: "Join room" }).click();
    const main = ada.page.getByRole("main");
    await expect(main.getByText(/Shared block · break at/)).toBeVisible();
    await expect(main.getByText(/Chat opens at the break/)).toBeVisible();
    await expect(main.getByLabel("Message the room")).toHaveCount(0);
    await archiveRoomForTest(room.id);
  });

  test("free members get one trial room; Pro members can host private rooms", async ({ browser }) => {
    const first = await createRoom(5);
    const second = await createRoom(5);
    const free = await person(browser, "Sam");
    await free.page.goto(`/app/rooms/${first.id}`);
    await free.page.getByRole("button", { name: "Join room" }).click();
    await expect(free.page.getByRole("button", { name: "Leave room" })).toBeVisible();
    await free.page.goto(`/app/rooms/${second.id}`);
    await free.page.getByRole("button", { name: "Join room" }).click();
    await expect(free.page.getByRole("main").getByRole("alert")).toContainText("one trial room");

    // Pro member hosts a private room and shares the invite link.
    const host = await person(browser, "Kemi", "premium");
    await host.page.goto("/app/rooms/new");
    await host.page.getByLabel("Room name").fill("Thesis writing club");
    await host.page.getByRole("button", { name: "Create room" }).click();
    await expect(host.page.getByRole("heading", { name: "Thesis writing club" })).toBeVisible();
    await expect(host.page.getByRole("button", { name: "Copy invite link" })).toBeVisible();
    const roomId = host.page.url().split("/").pop()!;

    // The private room isn't listed for others, and can't be joined without the link.
    await free.page.goto("/app/rooms");
    await expect(free.page.getByRole("main").getByText("Thesis writing club")).toHaveCount(0);
    await free.page.goto(`/app/rooms/${roomId}`);
    await expect(free.page.getByRole("heading", { name: "This page could not be found." })).toBeVisible();
    await archiveRoomForTest(first.id);
    await archiveRoomForTest(second.id);
    await archiveRoomForTest(roomId);
  });

  test("under-18 accounts can't join", async ({ browser }) => {
    const room = await createRoom(5);
    const p = await person(browser, "Lee", "premium");
    await setProfile(p.userId, { age_confirmed: false });
    await p.page.goto(`/app/rooms/${room.id}`);
    await p.page.getByRole("button", { name: "Join room" }).click();
    await expect(p.page.getByRole("main").getByRole("alert")).toContainText("18 and over");
    await archiveRoomForTest(room.id);
  });

  test("an admin removes a reported person in real time", async ({ browser }) => {
    const room = await createRoom(5);
    const ada = await person(browser, "Ada", "premium");
    const rex = await person(browser, "Rex", "premium");
    for (const p of [ada, rex]) {
      await p.page.goto(`/app/rooms/${room.id}`);
      await p.page.getByRole("button", { name: "Join room" }).click();
      await expect(p.page.getByRole("button", { name: "Leave room" })).toBeVisible();
    }
    const main = ada.page.getByRole("main");
    await main.getByRole("button", { name: /Rex: Camera off/ }).click();
    await ada.page.getByRole("menuitem", { name: "Report" }).click();
    const sheet = ada.page.getByRole("dialog", { name: "Report someone" });
    await sheet.getByRole("radio", { name: "Spam" }).click();
    await sheet.getByLabel("Anything else?").fill("Posting links");
    await sheet.getByRole("button", { name: "Send report" }).click();
    await expect(sheet.getByText("Thanks for telling us")).toBeVisible();

    const mod = await person(browser, "Mod", "premium");
    await setProfile(mod.userId, { role: "admin" });
    await mod.page.goto("/admin/reports");
    const card = mod.page.getByRole("listitem").filter({ hasText: "Posting links" });
    await expect(card).toContainText("Rex");
    mod.page.once("dialog", (d) => d.accept());
    await card.getByRole("button", { name: "Remove from room" }).click();
    // The report moves to the Closed tab with its outcome.
    await expect(card).toHaveCount(0);
    await mod.page.goto("/admin/reports?status=closed");
    await expect(
      mod.page.getByRole("listitem").filter({ hasText: "Posting links" }).filter({ hasText: "Rex" }).first(),
    ).toContainText("Removed from the room");

    // Rex's app hears about it straight away and leaves.
    await expect(rex.page.getByRole("main").getByRole("alert")).toContainText(
      "You've been removed from this room",
      { timeout: 15_000 },
    );
    expect((await participant(room.id, rex.userId))?.removed).toBe(true);
    await rex.page.goto(`/app/rooms/${room.id}`);
    await expect(rex.page.getByRole("heading", { name: "You've been removed from this room" })).toBeVisible();
    await archiveRoomForTest(room.id);
  });
});
