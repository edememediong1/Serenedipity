"use server";

import { createClient } from "@/lib/supabase/server";
import { getClientIp, hashKey } from "@/lib/server/rate-limit";
import { waitlistServerSchema, type WaitlistState } from "@/lib/validation/waitlist";

const SUCCESS: WaitlistState = {
  status: "success",
  message: "You're on the list. We'll email you when your spot is ready.",
};

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const parsed = waitlistServerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const emailIssue = parsed.error.issues.find((i) => i.path[0] === "email");
    return {
      status: "error",
      message: emailIssue?.message ?? "Something in the form needs another look.",
      fieldErrors: emailIssue ? { email: emailIssue.message } : undefined,
    };
  }

  const { company, email, ...rest } = parsed.data;

  // Honeypot filled: quietly pretend it worked so bots learn nothing.
  if (company) return SUCCESS;

  try {
    const supabase = await createClient();

    const { data: limited, error: limitError } = await supabase.rpc("rate_limit_hit", {
      p_bucket: "waitlist",
      p_key_hash: hashKey(await getClientIp()),
      p_max: 5,
      p_window_seconds: 600,
    });
    if (limitError) throw limitError;
    if (limited) {
      return {
        status: "error",
        message: "That's a few tries in a short time. Take a breath and try again in a few minutes.",
      };
    }

    const { error } = await supabase.from("waitlist").insert({ email: email.toLowerCase(), ...rest });
    // 23505 = already on the list. Show the same success so we never reveal who has joined.
    if (error && error.code !== "23505") throw error;

    return SUCCESS;
  } catch (error) {
    console.error("[waitlist] insert failed", error);
    return {
      status: "error",
      message: "We couldn't add you just now. Check your connection and try again.",
    };
  }
}
