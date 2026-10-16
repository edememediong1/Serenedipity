import { NOT_AVAILABLE_PATH, ONBOARDING_STEPS, stepIndex, stepPath } from "@/lib/onboarding/steps";
import { safeNextPath } from "./redirects";

export type RoutingProfile = {
  onboarding_step: number;
  onboarding_completed_at: string | null;
  age_confirmed: boolean;
  age_confirmed_at: string | null;
};

type Input = {
  pathname: string;
  search: string;
  isSignedIn: boolean;
  profile: RoutingProfile | null;
  /** Admin by role or ADMIN_EMAILS. Admins skip onboarding gates for /admin. */
  isAdminUser?: boolean;
};

const startsWithSegment = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export const isAppPath = (p: string) => startsWithSegment(p, "/app");
export const isOnboardingPath = (p: string) => startsWithSegment(p, "/onboarding");
export const isAuthScreen = (p: string) => p === "/login" || p === "/signup";
export const isAdminPath = (p: string) => startsWithSegment(p, "/admin");

/** True when the user answered the age question with "under 18". */
export function isUnderage(profile: RoutingProfile | null) {
  return !!profile && !profile.age_confirmed && !!profile.age_confirmed_at;
}

/**
 * The routing rules from the build brief. Returns a path to redirect to, or null to continue.
 * - Signed out on /app or /onboarding: go to /login, remembering where they were going.
 * - Signed in, onboarding unfinished: always land on the onboarding step they reached.
 * - Signed in, onboarding finished: /login, /signup and /onboarding go to /app (or `next`).
 */
export function resolveRedirect({
  pathname,
  search,
  isSignedIn,
  profile,
  isAdminUser = false,
}: Input): string | null {
  const isProtected = isAppPath(pathname) || isOnboardingPath(pathname) || isAdminPath(pathname);

  if (!isSignedIn) {
    if (!isProtected) return null;
    return `/login?next=${encodeURIComponent(`${pathname}${search}`)}`;
  }

  // The admin area: admins only (everyone else goes to the app), regardless of onboarding.
  if (isAdminPath(pathname)) return isAdminUser ? null : "/app";

  const onboarded = !!profile?.onboarding_completed_at;

  if (onboarded) {
    if (isAuthScreen(pathname)) {
      const next = safeNextPath(new URLSearchParams(search).get("next"));
      return next && !isAuthScreen(next.split("?")[0]) ? next : "/app";
    }
    if (isOnboardingPath(pathname)) return "/app";
    return null;
  }

  // Signed in without finished onboarding.
  if (isUnderage(profile)) {
    if (pathname === NOT_AVAILABLE_PATH) return null;
    return isProtected || isAuthScreen(pathname) ? NOT_AVAILABLE_PATH : null;
  }
  if (pathname === NOT_AVAILABLE_PATH) return stepPath(profile?.onboarding_step ?? 0);

  const reached = Math.min(profile?.onboarding_step ?? 0, ONBOARDING_STEPS.length - 1);

  if (isAppPath(pathname) || isAuthScreen(pathname) || pathname === "/onboarding") {
    return stepPath(reached);
  }
  if (isOnboardingPath(pathname)) {
    const requested = stepIndex(pathname.split("/")[2] ?? "");
    // Unknown step, or trying to skip ahead: go to the furthest step reached.
    if (requested === -1 || requested > reached) return stepPath(reached);
  }
  return null;
}
