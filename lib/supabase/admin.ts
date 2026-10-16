import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role Supabase client. Bypasses row-level security, so use it ONLY on the server, only after
 * an explicit admin check (lib/auth/admin.ts) or inside a verified webhook (Stripe).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY is required for admin tools and billing webhooks.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
