"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const MESSAGES: Record<string, { title: string; body: string }> = {
  expired: {
    title: "That link has expired.",
    body: "Sign-in links work once and last an hour. Ask for a fresh one and it'll be in your inbox shortly.",
  },
  cancelled: {
    title: "Sign-in was cancelled.",
    body: "No problem. You can pick another way to sign in, or try again whenever you're ready.",
  },
  network: {
    title: "We couldn't reach the server.",
    body: "Check your connection, then try again.",
  },
  provider: {
    title: "That sign-in option didn't work.",
    body: "Try again, or use an email link instead.",
  },
  unavailable: {
    title: "That sign-in option isn't available yet.",
    body: "Use an email link or Google for now.",
  },
  invalid: {
    title: "That link looks incomplete.",
    body: "It may have been cut off by your email app. Ask for a new one.",
  },
  unknown: {
    title: "Something got in the way.",
    body: "Please try again. If it keeps happening, ask for a new link.",
  },
};

/** Supabase can also put errors in the URL fragment (#error_code=otp_expired), which only the browser sees. */
function readHashReason() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const code = hash.get("error_code");
  if (code === "otp_expired") return "expired";
  if (hash.get("error") === "access_denied") return "cancelled";
  return null;
}

export function AuthErrorDetails() {
  const params = useSearchParams();
  const hashReason = useSyncExternalStore(
    () => () => {},
    readHashReason,
    () => null,
  );
  const reason = hashReason ?? params.get("reason") ?? "unknown";
  const message = MESSAGES[reason] ?? MESSAGES.unknown;

  return (
    <div className="flex flex-col gap-5">
      <div role="alert" className="flex flex-col gap-2">
        <p className="type-h2">{message.title}</p>
        <p className="text-ink-muted">{message.body}</p>
      </div>
      <Button asChild block size="lg">
        <Link href="/login">{reason === "expired" ? "Send a new link" : "Back to sign in"}</Link>
      </Button>
      <Button asChild variant="ghost" block>
        <Link href="/">Go to the home page</Link>
      </Button>
    </div>
  );
}
