import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * The signed-in user and their profile, verified with Supabase Auth.
 * Redirects to /login when there is no session. Deduped per request.
 * Reads cookies, so call it from a component inside <Suspense>.
 */
export const getSessionProfile = cache(async () => {
  // Session checks compare token expiry with the current time, so this always runs at request time.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) {
    // Keep the database error in the server log. In particular, PGRST205 means the
    // profiles migration has not been applied, rather than that this user is missing.
    console.error("[auth] profile lookup failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Unable to load the signed-in user's profile (${error.code || "database error"}).`);
  }
  if (!profile) throw new Error("Profile not found for the signed-in user.");

  return { user: { id: user.id, email: user.email ?? null }, profile, supabase };
});
