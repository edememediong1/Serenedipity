import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirects";
import { resolveRedirect, type RoutingProfile } from "@/lib/auth/routing";

const fresh: RoutingProfile = {
  onboarding_step: 0,
  onboarding_completed_at: null,
  age_confirmed: false,
  age_confirmed_at: null,
};
const midway: RoutingProfile = {
  ...fresh,
  onboarding_step: 3,
  age_confirmed: true,
  age_confirmed_at: "2026-10-16T00:00:00Z",
};
const done: RoutingProfile = {
  ...midway,
  onboarding_step: 6,
  onboarding_completed_at: "2026-10-16T00:00:00Z",
};
const minor: RoutingProfile = {
  ...fresh,
  onboarding_step: 1,
  age_confirmed: false,
  age_confirmed_at: "2026-10-16T00:00:00Z",
};

const go = (pathname: string, isSignedIn: boolean, profile: RoutingProfile | null, search = "") =>
  resolveRedirect({ pathname, search, isSignedIn, profile });

describe("resolveRedirect", () => {
  it("sends signed-out visitors on protected routes to /login with next", () => {
    expect(go("/app/focus", false, null, "?x=1")).toBe("/login?next=%2Fapp%2Ffocus%3Fx%3D1");
    expect(go("/onboarding/goals", false, null)).toBe("/login?next=%2Fonboarding%2Fgoals");
    expect(go("/", false, null)).toBeNull();
    expect(go("/login", false, null)).toBeNull();
    expect(go("/application", false, null)).toBeNull();
  });

  it("keeps unfinished users in onboarding at the step they reached", () => {
    expect(go("/app", true, midway)).toBe("/onboarding/rhythm");
    expect(go("/login", true, midway)).toBe("/onboarding/rhythm");
    expect(go("/onboarding", true, midway)).toBe("/onboarding/rhythm");
    expect(go("/onboarding/done", true, midway)).toBe("/onboarding/rhythm");
    expect(go("/onboarding/nope", true, midway)).toBe("/onboarding/rhythm");
    expect(go("/onboarding/goals", true, midway)).toBeNull(); // going back is fine
    expect(go("/onboarding/rhythm", true, midway)).toBeNull();
    expect(go("/app", true, null)).toBe("/onboarding/welcome");
  });

  it("sends finished users from auth screens and onboarding to /app or next", () => {
    expect(go("/login", true, done)).toBe("/app");
    expect(go("/signup", true, done, "?next=%2Fapp%2Frooms")).toBe("/app/rooms");
    expect(go("/login", true, done, "?next=https%3A%2F%2Fevil.com")).toBe("/app");
    expect(go("/onboarding/goals", true, done)).toBe("/app");
    expect(go("/app/settings", true, done)).toBeNull();
  });

  it("stops under-18 users at the not-available screen", () => {
    expect(go("/app", true, minor)).toBe("/onboarding/not-available");
    expect(go("/onboarding/goals", true, minor)).toBe("/onboarding/not-available");
    expect(go("/onboarding/not-available", true, minor)).toBeNull();
    expect(go("/", true, minor)).toBeNull();
    expect(go("/onboarding/not-available", true, midway)).toBe("/onboarding/rhythm");
  });
});

describe("admin routes", () => {
  it("require sign-in, then the admin role", () => {
    expect(go("/admin", false, null)).toBe("/login?next=%2Fadmin");
    expect(resolveRedirect({ pathname: "/admin/users", search: "", isSignedIn: true, profile: done })).toBe(
      "/app",
    );
    expect(
      resolveRedirect({
        pathname: "/admin",
        search: "",
        isSignedIn: true,
        profile: fresh,
        isAdminUser: true,
      }),
    ).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("allows only same-origin relative paths", () => {
    expect(safeNextPath("/app?tab=1")).toBe("/app?tab=1");
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
