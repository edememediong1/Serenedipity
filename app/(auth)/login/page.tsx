import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm, AuthFormFallback } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { LegalNote } from "@/components/auth/legal-note";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in with an email link, Google or Apple.",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Log in"
      title={
        <>
          Welcome <em>back</em>
        </>
      }
      description="Your space is right where you left it."
      footer={<LegalNote />}
    >
      <Suspense fallback={<AuthFormFallback />}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
