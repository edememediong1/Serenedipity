import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only routes that need the session. The marketing pages stay fully static and fast.
  matcher: ["/app/:path*", "/admin/:path*", "/onboarding/:path*", "/login", "/signup", "/auth/:path*"],
};
