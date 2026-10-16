"use client";

import { useSyncExternalStore } from "react";
import { EMAIL_HINT_KEY } from "@/components/auth/auth-form";

function readHint() {
  try {
    return sessionStorage.getItem(EMAIL_HINT_KEY);
  } catch {
    return null;
  }
}

/** Shows the address the link went to. Read from sessionStorage so the email never sits in a URL. */
export function EmailHint() {
  const email = useSyncExternalStore(
    () => () => {},
    readHint,
    () => null,
  );
  return (
    <p className="type-h3">
      {email ? (
        <>
          We sent a sign-in link to <span className="break-all text-blue-soft">{email}</span>.
        </>
      ) : (
        "We sent you a sign-in link."
      )}
    </p>
  );
}
