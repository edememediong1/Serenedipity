"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { joinWaitlist } from "@/app/(marketing)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { captureUtmParams } from "@/lib/utm";
import {
  UTM_KEYS,
  waitlistFormSchema,
  type UtmKey,
  type WaitlistFormValues,
  type WaitlistState,
} from "@/lib/validation/waitlist";

const initialState: WaitlistState = { status: "idle" };

export function WaitlistForm({ source = "landing" }: { source?: string }) {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState);
  const [utm, setUtm] = useState<Partial<Record<UtmKey, string>>>({});
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistFormSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    // Reading the URL is a browser-only side effect, so it happens after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUtm(captureUtmParams());
  }, []);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-md border border-line bg-surface-glass p-4"
      >
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 stroke-[1.5] text-blue-soft" aria-hidden="true" />
        <p>{state.message}</p>
      </div>
    );
  }

  const onValid = (_values: WaitlistFormValues, event?: React.BaseSyntheticEvent) => {
    const form = event?.target as HTMLFormElement | undefined;
    if (!form) return;
    startTransition(() => formAction(new FormData(form)));
  };

  const emailError =
    errors.email?.message ?? (state.status === "error" ? state.fieldErrors?.email : undefined);
  const formError = state.status === "error" && !state.fieldErrors?.email ? state.message : undefined;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onValid)}
      className="flex flex-col gap-3"
      aria-label="Join the waitlist"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Input
          {...register("email")}
          label="Email"
          hideLabel
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          error={emailError}
          containerClassName="flex-1"
          className="min-h-14"
        />
        <Button type="submit" size="lg" disabled={pending} className="sm:min-w-44">
          {pending ? "Joining…" : "Join the waitlist"}
        </Button>
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input type="hidden" name="source" value={source} />
      {UTM_KEYS.map((key) => (
        <input key={key} type="hidden" name={key} value={utm[key] ?? ""} />
      ))}

      {formError ? (
        <p role="alert" className="type-body-sm text-critical">
          {formError}
        </p>
      ) : (
        <p className="type-body-sm text-ink-muted">One email when your spot is ready. No spam.</p>
      )}
    </form>
  );
}
