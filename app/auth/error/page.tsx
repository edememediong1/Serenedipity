import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthErrorDetails } from "./details";

export const metadata: Metadata = { title: "Sign-in problem", robots: { index: false } };

export default function AuthErrorPage() {
  return (
    <AuthShell
      eyebrow="Sign-in"
      title={
        <>
          Let&apos;s try that <em>again</em>
        </>
      }
    >
      <Suspense fallback={<p className="text-ink-muted">Something got in the way of signing you in.</p>}>
        <AuthErrorDetails />
      </Suspense>
    </AuthShell>
  );
}
