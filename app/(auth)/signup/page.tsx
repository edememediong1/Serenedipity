import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm, AuthFormFallback } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { LegalNote } from "@/components/auth/legal-note";

export const metadata: Metadata = {
  title: "Start free",
  description: "Create your space with an email link, Google or Apple.",
};

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Start free"
      title={
        <>
          Let&apos;s set up your <em>space</em>
        </>
      }
      description="It takes about a minute. No password, no card."
      footer={<LegalNote />}
    >
      <Suspense fallback={<AuthFormFallback />}>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
