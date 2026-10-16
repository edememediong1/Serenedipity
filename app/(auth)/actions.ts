"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirects";
import { FEATURE_FLAGS } from "@/lib/config";
import { getRequestOrigin } from "@/lib/server/origin";
import { createClient } from "@/lib/supabase/server";
import { magicLinkSchema, PLAN_INTENTS, type AuthFormState, type PlanIntent } from "@/lib/validation/auth";

function callbackUrl(origin: string, next: string | null) {
  return `${origin}/auth/callback?next=${encodeURIComponent(next ?? "/app")}`;
}

function planIntent(value: FormDataEntryValue | null): PlanIntent | undefined {
  return PLAN_INTENTS.find((p) => p === value);
}

/** Sends a magic link. Creates the account on first use, so login and signup share one path. */
export async function sendMagicLink(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your email address." };
  }

  const next = safeNextPath(formData.get("next")?.toString());
  const plan = planIntent(formData.get("plan"));

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        emailRedirectTo: callbackUrl(await getRequestOrigin(), next),
        shouldCreateUser: true,
        data: plan ? { plan_intent: plan } : undefined,
      },
    });
    if (error) {
      if (error.status === 429 || error.code === "over_email_send_rate_limit") {
        return {
          status: "error",
          message: "We've sent a few links already. Give it a minute, then try again.",
        };
      }
      throw error;
    }
  } catch (error) {
    console.error("[auth] magic link failed", error);
    return {
      status: "error",
      message: "We couldn't send your link just now. Check your connection and try again.",
    };
  }

  redirect("/auth/check-email");
}

/** Starts Google or Apple sign-in and hands the browser to the provider. */
export async function signInWithProvider(formData: FormData) {
  const provider = formData.get("provider");
  if (provider !== "google" && provider !== "apple") redirect("/auth/error?reason=unknown");
  if (provider === "apple" && !FEATURE_FLAGS.appleSignIn) redirect("/auth/error?reason=unavailable");

  const next = safeNextPath(formData.get("next")?.toString());
  let url: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl(await getRequestOrigin(), next) },
    });
    if (error) throw error;
    url = data.url;
  } catch (error) {
    console.error(`[auth] ${provider} sign-in failed to start`, error);
  }

  redirect(url ?? "/auth/error?reason=provider");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
