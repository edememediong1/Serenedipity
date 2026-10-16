import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveRedirect, type RoutingProfile } from "@/lib/auth/routing";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Refreshes the Supabase session cookie and applies the routing rules.
 * Pages and Server Actions still verify the user themselves; this is the first line, not the only one.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;

  let profile: (RoutingProfile & { role: string }) | null = null;
  if (userId) {
    const { data: row, error } = await supabase
      .from("profiles")
      .select("onboarding_step, onboarding_completed_at, age_confirmed, age_confirmed_at, role")
      .eq("id", userId)
      .maybeSingle();
    if (error?.code === "42703" && error.message.includes("profiles.role")) {
      // Keep auth and onboarding usable during a rolling deploy where application code
      // arrives before the admin migration that adds profiles.role.
      console.warn("[auth] profiles.role is missing; apply the latest Supabase migrations");
      const { data: legacyRow, error: legacyError } = await supabase
        .from("profiles")
        .select("onboarding_step, onboarding_completed_at, age_confirmed, age_confirmed_at")
        .eq("id", userId)
        .maybeSingle();
      if (legacyError) console.error("[auth] legacy profile lookup failed", legacyError);
      profile = legacyRow ? { ...legacyRow, role: "user" } : null;
    } else {
      if (error) console.error("[auth] routing profile lookup failed", error);
      profile = row;
    }
  }

  const { pathname, search } = request.nextUrl;
  const email = typeof data?.claims?.email === "string" ? data.claims.email.toLowerCase() : null;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminUser = profile?.role === "admin" || (!!email && adminEmails.includes(email));
  const target = resolveRedirect({ pathname, search, isSignedIn: !!userId, profile, isAdminUser });

  if (target) {
    const redirect = NextResponse.redirect(new URL(target, request.url));
    // Carry refreshed auth cookies across the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  return response;
}
