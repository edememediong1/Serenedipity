import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import type { Database } from "@/lib/supabase/database.types";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error("E2E needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/**
 * Signs a new (or existing) user in through the real /auth/callback route using an admin-generated
 * magic-link token, the same path a user's email link takes.
 */
export async function signInAs(page: Page, email = uniqueEmail(), next = "/app") {
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const tokenHash = data.properties.hashed_token;
  await page.goto(`/auth/callback?token_hash=${tokenHash}&type=email&next=${encodeURIComponent(next)}`);
  return { email, userId: data.user.id };
}

export async function getProfile(userId: string) {
  const { data, error } = await admin().from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export async function completeOnboarding(userId: string, displayName = "Ada") {
  const now = new Date().toISOString();
  const { error } = await admin()
    .from("profiles")
    .update({
      display_name: displayName,
      age_confirmed: true,
      age_confirmed_at: now,
      ai_guide_consent: true,
      ai_guide_consent_at: now,
      onboarding_step: 6,
      onboarding_completed_at: now,
    })
    .eq("id", userId);
  if (error) throw error;
}
