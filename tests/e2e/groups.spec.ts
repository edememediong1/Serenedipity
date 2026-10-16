import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser } from "@playwright/test";
import {
  backdateMembership,
  completeOnboarding,
  createRoom,
  groupBySlug,
  memberStatus,
  setProfile,
  signInAs,
  uniqueEmail,
  userClient,
} from "./helpers";

async function person(browser: Browser, name: string, plan: "free" | "premium" = "free") {
  const context = await browser.newContext();
  const page = await context.newPage();
  const { userId } = await signInAs(page, uniqueEmail(name.toLowerCase()), "/onboarding");
  await completeOnboarding(userId, name);
  await setProfile(userId, { plan, timezone: "UTC" });
  return { page, userId };
}

async function createGroup(
  page: import("@playwright/test").Page,
  name: string,
  visibility: "Open" | "Request to join" | "Invite only" = "Open",
) {
  await page.goto("/app/groups/new");
  const main = page.getByRole("main");
  await expect(async () => {
    await main.getByLabel("Group name").fill(name);
    await expect(main.getByLabel("Group name")).toHaveValue(name, { timeout: 500 });
  }).toPass();
  await main.getByLabel(/What.s it for/).fill(`A group for ${name.toLowerCase()}.`);
  await main.getByRole("radio", { name: new RegExp(`^${visibility}`) }).click();
  await main.getByRole("button", { name: "Create group" }).click();
  await expect(main.getByRole("heading", { level: 1, name })).toBeVisible();
  return page.url().split("/app/groups/")[1].split("?")[0];
}

async function post(page: import("@playwright/test").Page, text: string, kind?: string) {
  const main = page.getByRole("main");
  if (kind) await main.getByRole("radio", { name: kind }).click();
  await main.getByRole("textbox", { name: "Write a post" }).fill(text);
  await main.getByRole("button", { name: "Post", exact: true }).click();
}

test.describe("study groups", () => {
  test.describe.configure({ timeout: 120_000 });

  test("Pro members create groups; members post, comment and react; outsiders can't read", async ({
    browser,
  }) => {
    const free = await person(browser, "Tomi");
    await free.page.goto("/app/groups/new");
    await expect(
      free.page.getByRole("main").getByText("Starting study groups is part of Pro."),
    ).toBeVisible();

    const owner = await person(browser, "Ada", "premium");
    const name = `Thesis writers ${Date.now() % 100000}`;
    const slug = await createGroup(owner.page, name);
    await post(owner.page, "Welcome! Share today's writing goal.");
    await expect(owner.page.getByRole("main").getByText("Posted.")).toBeVisible();
    let results = await new AxeBuilder({ page: owner.page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

    // Discover, join, comment and react.
    await free.page.goto(`/app/groups?q=${encodeURIComponent(name)}`);
    await free.page
      .getByRole("main")
      .getByRole("link", { name: new RegExp(name) })
      .click();
    const main = free.page.getByRole("main");
    await main.getByRole("button", { name: "Join group" }).click();
    await expect(main.getByText("Welcome! Share today's writing goal.")).toBeVisible();
    await main.getByRole("button", { name: "React fire" }).click();
    await expect(main.getByRole("button", { name: "React fire, 1" })).toHaveAttribute("aria-pressed", "true");
    await main.getByRole("button", { name: "Comment", exact: true }).click();
    await main.getByLabel("Write a comment").fill("500 words before lunch.");
    await main.getByRole("button", { name: "Send" }).click();
    await expect(main.getByText("500 words before lunch.")).toBeVisible();
    results = await new AxeBuilder({ page: free.page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

    // A "win" post carries the author's streak snapshot.
    await post(free.page, "Finished my methods section!", "Win");
    await expect(main.getByText(/day streak/).first()).toBeVisible();

    // Outsiders see the About page only, and RLS blocks direct reads and writes.
    const outsider = await person(browser, "Sam");
    await outsider.page.goto(`/app/groups/${slug}?tab=feed`);
    await expect(outsider.page.getByRole("main").getByText("Join the group to see its posts")).toBeVisible();
    const group = await groupBySlug(slug);
    const db = await userClient(outsider.userId);
    const { data: posts } = await db.from("group_posts").select("id").eq("group_id", group.id);
    expect(posts).toEqual([]);
    const { error: codeError } = await db.from("groups").select("invite_code").eq("id", group.id);
    expect(codeError).not.toBeNull();
    const { error: insertError } = await db
      .from("group_posts")
      .insert({ group_id: group.id, author_id: outsider.userId, body: "sneaky" });
    expect(insertError).not.toBeNull();
    // Even members can't write directly (all writes go through checked server actions).
    const memberDb = await userClient(free.userId);
    const { error: memberInsert } = await memberDb
      .from("group_posts")
      .insert({ group_id: group.id, author_id: free.userId, body: "direct" });
    expect(memberInsert).not.toBeNull();
  });

  test("request-to-join approval, and private groups by invite link", async ({ browser }) => {
    const owner = await person(browser, "Kemi", "premium");
    const slug = await createGroup(owner.page, `Bar exam prep ${Date.now() % 100000}`, "Request to join");
    const group = await groupBySlug(slug);

    const asker = await person(browser, "Lee");
    await asker.page.goto(`/app/groups/${slug}`);
    await asker.page.getByRole("main").getByRole("button", { name: "Ask to join" }).click();
    await expect(
      asker.page.getByRole("main").getByText("Request sent. A moderator will review it.").first(),
    ).toBeVisible();
    expect((await memberStatus(group.id, asker.userId))?.status).toBe("pending");

    await owner.page.goto(`/app/groups/${slug}?tab=members`);
    const requests = owner.page.getByRole("region", { name: /Requests to join/ });
    await requests.getByRole("button", { name: "Approve" }).click();
    await expect.poll(async () => (await memberStatus(group.id, asker.userId))?.status).toBe("active");

    // Private: hidden from non-members, joinable by link.
    const privateSlug = await createGroup(
      owner.page,
      `Founders circle ${Date.now() % 100000}`,
      "Invite only",
    );
    const priv = await groupBySlug(privateSlug);
    const guest = await person(browser, "Noor");
    await guest.page.goto(`/app/groups/${privateSlug}`);
    await expect(guest.page.getByRole("heading", { name: "This page could not be found." })).toBeVisible();
    await guest.page.goto(`/app/groups/join/${priv.invite_code}`);
    await guest.page.getByRole("main").getByRole("button", { name: "Join group" }).click();
    await expect(guest.page).toHaveURL(new RegExp(`/app/groups/${privateSlug}$`));
    expect((await memberStatus(priv.id, guest.userId))?.status).toBe("active");
  });

  test("content screen, reports, bans and the link rule", async ({ browser }) => {
    const owner = await person(browser, "Ada", "premium");
    const slug = await createGroup(owner.page, `Calm coders ${Date.now() % 100000}`);
    const group = await groupBySlug(slug);
    const troll = await person(browser, "Rex");
    const member = await person(browser, "Tomi");
    for (const p of [troll, member]) {
      await p.page.goto(`/app/groups/${slug}`);
      await p.page.getByRole("main").getByRole("button", { name: "Join group" }).click();
      await expect(p.page.getByRole("main").getByRole("textbox", { name: "Write a post" })).toBeVisible();
    }

    // Abuse is held for moderators; only the author (and mods) can see it.
    await post(troll.page, "kys nobody likes you");
    await expect(
      troll.page.getByRole("main").getByText("Your post is waiting for a moderator to review it."),
    ).toBeVisible();
    await member.page.reload();
    await expect(member.page.getByRole("main").getByText("kys nobody likes you")).toHaveCount(0);

    // Self-harm language shows support resources instead of publishing.
    await post(member.page, "honestly I want to die before this exam");
    await expect(
      member.page.getByRole("main").getByRole("region", { name: "Talk to someone now" }),
    ).toBeVisible();

    // Links wait until a member's second day.
    await post(troll.page, "free stuff at https://spam.example.com");
    await expect(
      troll.page.getByRole("main").getByText("New members can share links after their first day"),
    ).toBeVisible();
    await backdateMembership(group.id, member.userId);
    await post(member.page, "Great notes: https://example.com/notes");
    await expect(member.page.getByRole("main").getByText("Posted.")).toBeVisible();

    // Rex posts something rude enough to report.
    await post(troll.page, "this group is garbage and so are you all");
    await expect(troll.page.getByRole("main").getByText("Posted.")).toBeVisible();
    await member.page.reload();
    const mm = member.page.getByRole("main");
    await mm.getByRole("button", { name: "Post options for Rex's post" }).first().click();
    await member.page.getByRole("menuitem", { name: "Report post" }).click();
    const sheet = member.page.getByRole("dialog", { name: "Report this post" });
    await sheet.getByRole("radio", { name: "Harassment or bullying" }).click();
    await sheet.getByRole("button", { name: "Send report" }).click();
    await expect(sheet.getByText("Thanks. The moderators will take a look.")).toBeVisible();

    // The owner sees the held post and the report in Moderation, removes and bans.
    await owner.page.goto(`/app/groups/${slug}?tab=moderation`);
    const om = owner.page.getByRole("main");
    await expect(om.getByText("kys nobody likes you")).toBeVisible();
    await expect(om.getByText("this group is garbage and so are you all")).toBeVisible();
    owner.page.once("dialog", (d) => d.accept());
    await om.getByRole("button", { name: "Ban Rex" }).click();
    await expect.poll(async () => (await memberStatus(group.id, troll.userId))?.status).toBe("banned");
    await member.page.reload();
    await expect(mm.getByText("this group is garbage")).toHaveCount(0);

    // Banned members can't rejoin.
    await troll.page.goto(`/app/groups/${slug}`);
    await expect(troll.page.getByRole("main").getByText("You can't take part in this group.")).toBeVisible();
  });

  test("group rooms are for members, and don't use the free trial room", async ({ browser }) => {
    const owner = await person(browser, "Kemi", "premium");
    const slug = await createGroup(owner.page, `Morning sprint club ${Date.now() % 100000}`);
    const group = await groupBySlug(slug);
    await owner.page.goto(`/app/groups/${slug}?tab=rooms`);
    const om = owner.page.getByRole("main");
    await om.getByLabel("Room name").fill("Club sprint");
    await om.getByRole("button", { name: "Schedule room" }).click();
    await expect(om.getByRole("heading", { level: 1, name: "Club sprint" })).toBeVisible({ timeout: 20_000 });
    const roomUrl = owner.page.url();

    // Non-members can't see it.
    const outsider = await person(browser, "Sam");
    await outsider.page.goto(roomUrl);
    await expect(outsider.page.getByRole("heading", { name: "This page could not be found." })).toBeVisible();

    // A free member joins the group room, then can still use their trial on a public room.
    const member = await person(browser, "Tomi");
    await member.page.goto(`/app/groups/${slug}`);
    await member.page.getByRole("main").getByRole("button", { name: "Join group" }).click();
    await expect.poll(async () => (await memberStatus(group.id, member.userId))?.status).toBe("active");
    await member.page.goto(roomUrl);
    await member.page.getByRole("main").getByRole("button", { name: "Join room" }).click();
    await expect(member.page.getByRole("main").getByRole("button", { name: "Leave room" })).toBeVisible();
    const publicRoom = await createRoom(5);
    await member.page.goto(`/app/rooms/${publicRoom.id}`);
    await member.page.getByRole("main").getByRole("button", { name: "Join room" }).click();
    await expect(member.page.getByRole("main").getByRole("button", { name: "Leave room" })).toBeVisible();
  });
});
