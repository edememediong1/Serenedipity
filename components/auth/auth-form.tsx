"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { useFormStatus } from "react-dom";
import { sendMagicLink, signInWithProvider } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FEATURE_FLAGS } from "@/lib/config";
import { magicLinkSchema, type AuthFormState, type MagicLinkValues } from "@/lib/validation/auth";
import { AppleIcon, GoogleIcon } from "./provider-icons";

export const EMAIL_HINT_KEY = "auth-email-hint";

type Mode = "login" | "signup";

function ProviderButton({
  provider,
  label,
  icon,
}: {
  provider: "google" | "apple";
  label: string;
  icon: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="provider"
      value={provider}
      variant="secondary"
      size="lg"
      block
      disabled={pending}
    >
      {icon}
      {pending ? "Opening…" : label}
    </Button>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const plan = params.get("plan") ?? "";
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(sendMagicLink, {
    status: "idle",
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkValues>({ resolver: zodResolver(magicLinkSchema), defaultValues: { email: "" } });

  const onValid = (values: MagicLinkValues, event?: React.BaseSyntheticEvent) => {
    const form = event?.target as HTMLFormElement | undefined;
    if (!form) return;
    try {
      sessionStorage.setItem(EMAIL_HINT_KEY, values.email);
    } catch {
      // Private mode: the check-email screen just won't show the address.
    }
    startTransition(() => formAction(new FormData(form)));
  };

  const query = new URLSearchParams();
  if (next) query.set("next", next);
  if (plan) query.set("plan", plan);
  const qs = query.toString() ? `?${query}` : "";
  const showGoogle = FEATURE_FLAGS.googleSignIn;
  const showApple = FEATURE_FLAGS.appleSignIn;

  return (
    <div className="flex flex-col gap-6">
      <form
        noValidate
        onSubmit={handleSubmit(onValid)}
        className="flex flex-col gap-4"
        aria-label="Sign in with email"
      >
        <Input
          {...register("email")}
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          autoFocus
          error={errors.email?.message}
        />
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="plan" value={plan} />
        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "Sending your link…" : "Email me a sign-in link"}
        </Button>
        {state.status === "error" ? (
          <p role="alert" className="type-body-sm text-critical">
            {state.message}
          </p>
        ) : (
          <p className="type-body-sm text-ink-muted">
            No password needed. We&apos;ll email you a link that signs you in.
          </p>
        )}
      </form>

      {showGoogle || showApple ? (
        <>
          <div className="flex items-center gap-3" role="separator" aria-label="or">
            <span className="h-px flex-1 bg-line" />
            <span className="type-body-sm text-ink-muted" aria-hidden="true">
              or
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <form action={signInWithProvider} className="flex flex-col gap-3">
            <input type="hidden" name="next" value={next} />
            {showGoogle ? (
              <ProviderButton provider="google" label="Continue with Google" icon={<GoogleIcon />} />
            ) : null}
            {showApple ? (
              <ProviderButton provider="apple" label="Continue with Apple" icon={<AppleIcon />} />
            ) : null}
          </form>
        </>
      ) : null}

      <p className="text-center type-body-sm text-ink-muted">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <Link
          href={`${mode === "login" ? "/signup" : "/login"}${qs}`}
          className="rounded-sm font-semibold text-blue-soft underline-offset-4 focus-ring hover:underline"
        >
          {mode === "login" ? "Create your space" : "Log in"}
        </Link>
      </p>
    </div>
  );
}

/** Same footprint as the form while search params resolve, so nothing jumps. */
export function AuthFormFallback() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="h-5 w-12 rounded-sm bg-surface-deep" />
      <div className="h-12 rounded-sm bg-surface-deep" />
      <div className="h-14 rounded-md bg-surface-deep" />
      <div className="mt-6 h-14 rounded-md bg-surface-deep" />
    </div>
  );
}
