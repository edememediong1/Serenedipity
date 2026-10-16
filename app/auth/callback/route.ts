import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

function errorRedirect(request: NextRequest, reason: string) {
  return NextResponse.redirect(new URL(`/auth/error?reason=${reason}`, request.url));
}

/**
 * Finishes sign-in for both flows:
 * - OAuth (Google, Apple): ?code=… (PKCE)
 * - Magic link email: ?token_hash=…&type=email (works across devices and browsers)
 * Then redirects to `next`; the proxy routes unfinished users into onboarding.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get("next")) ?? "/app";

  const providerError = params.get("error");
  if (providerError) {
    const code = params.get("error_code") ?? "";
    if (providerError === "access_denied" && code !== "otp_expired")
      return errorRedirect(request, "cancelled");
    if (code === "otp_expired") return errorRedirect(request, "expired");
    return errorRedirect(request, "provider");
  }

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return errorRedirect(request, error.code === "flow_state_expired" ? "expired" : "provider");
    } else if (tokenHash && type && OTP_TYPES.includes(type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error)
        return errorRedirect(
          request,
          error.code === "otp_expired" || error.status === 403 ? "expired" : "unknown",
        );
    } else {
      return errorRedirect(request, "invalid");
    }
  } catch (error) {
    console.error("[auth] callback failed", error);
    return errorRedirect(request, "network");
  }

  return NextResponse.redirect(new URL(next, request.url));
}
