import { describe, expect, it } from "vitest";
import { screenContent } from "@/lib/groups/moderation";
import { canActOn, joinOutcome, rateLimited, slugify, type JoinContext } from "@/lib/groups/rules";
import { PostInput } from "@/lib/groups/validation";

const base: JoinContext = {
  visibility: "public",
  codeValid: false,
  ageConfirmed: true,
  existing: null,
};

describe("joining groups", () => {
  it("public groups join instantly; request groups wait for approval unless invited", () => {
    expect(joinOutcome(base)).toEqual({ ok: true, status: "active" });
    expect(joinOutcome({ ...base, visibility: "request" })).toEqual({ ok: true, status: "pending" });
    expect(joinOutcome({ ...base, visibility: "request", codeValid: true })).toEqual({
      ok: true,
      status: "active",
    });
  });
  it("private groups need the invite link", () => {
    expect(joinOutcome({ ...base, visibility: "private" })).toEqual({ ok: false, reason: "invite_only" });
    expect(joinOutcome({ ...base, visibility: "private", codeValid: true })).toMatchObject({ ok: true });
  });
  it("enforces age and bans; joining is free on every plan", () => {
    expect(joinOutcome({ ...base, ageConfirmed: false })).toMatchObject({ reason: "age" });
    expect(joinOutcome({ ...base, existing: "banned", codeValid: true })).toMatchObject({ reason: "banned" });
    expect(joinOutcome({ ...base, existing: "active" })).toMatchObject({ reason: "already" });
    // A pending request can be completed with an invite link.
    expect(
      joinOutcome({ ...base, visibility: "request", existing: "pending", codeValid: true }),
    ).toMatchObject({
      status: "active",
    });
  });
});

describe("roles", () => {
  it("moderators manage members, the owner manages moderators, nobody manages the owner", () => {
    expect(canActOn("moderator", "member", false)).toBe(true);
    expect(canActOn("moderator", "moderator", false)).toBe(false);
    expect(canActOn("owner", "moderator", false)).toBe(true);
    expect(canActOn("owner", "owner", false)).toBe(false);
    expect(canActOn("member", "member", false)).toBe(false);
    expect(canActOn("owner", "member", true)).toBe(false);
  });
});

describe("posting", () => {
  it("rate limits within a window", () => {
    const now = Date.parse("2026-10-16T12:00:00Z");
    const recent = Array.from({ length: 5 }, (_, i) => new Date(now - i * 60_000).toISOString());
    expect(rateLimited(recent, { count: 5, windowMs: 3_600_000 }, now)).toBe(true);
    expect(rateLimited(recent.slice(1), { count: 5, windowMs: 3_600_000 }, now)).toBe(false);
    const old = [new Date(now - 7_200_000).toISOString()];
    expect(rateLimited(old, { count: 1, windowMs: 3_600_000 }, now)).toBe(false);
  });

  it("screens content: support for self-harm, hold for abuse and spam", () => {
    expect(screenContent("Finished chapter 3 today!")).toEqual({ action: "allow" });
    expect(screenContent("honestly I want to die before this exam")).toEqual({
      action: "support",
      reason: "self_harm",
    });
    expect(screenContent("kys")).toMatchObject({ action: "hold", reason: "abuse" });
    expect(screenContent("a https://a.co b https://b.co c https://c.co d https://d.co")).toMatchObject({
      reason: "spam",
    });
    expect(screenContent("noooooooooooooooooooo")).toMatchObject({ reason: "spam" });
  });

  it("validates links", () => {
    const ok = PostInput.safeParse({
      groupId: crypto.randomUUID(),
      kind: "resource",
      body: "Notes",
      linkUrl: "https://example.com/notes",
    });
    expect(ok.success).toBe(true);
    const bad = PostInput.safeParse({
      groupId: crypto.randomUUID(),
      kind: "resource",
      body: "Notes",
      linkUrl: "javascript:alert(1)",
    });
    expect(bad.success).toBe(false);
    const none = PostInput.safeParse({
      groupId: crypto.randomUUID(),
      kind: "update",
      body: "Hi",
      linkUrl: "",
    });
    expect(none.success && none.data.linkUrl).toBe(null);
  });

  it("slugifies names", () => {
    expect(slugify("Med School Finals 2027!")).toBe("med-school-finals-2027");
    expect(slugify("Ça va? Français")).toBe("ca-va-francais");
    expect(slugify("Hi")).toBe("group-hi");
  });
});
