"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { updatePreferences, type SettingsResult } from "@/app/app/settings/actions";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import {
  FOCUS_LENGTHS,
  GOALS,
  MUSIC_STYLES,
  WORK_STYLES,
  focusLengthFor,
  preferencesSchema,
  type PreferencesValues,
} from "@/lib/validation/onboarding";

type Output = ReturnType<typeof preferencesSchema.parse>;

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 id={id} className="type-h3">
          {label}
        </h3>
        {hint ? <p className="type-body-sm text-ink-muted">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function SettingsForm({ defaults }: { defaults: PreferencesValues }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SettingsResult | null>(null);
  const form = useForm<PreferencesValues, unknown, Output>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: defaults,
  });
  const length = focusLengthFor(Number(useWatch({ control: form.control, name: "focus_length" })));

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      setResult(null);
      setResult(await updatePreferences(values));
    }),
  );

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <GlassCard id="profile" className="flex scroll-mt-24 flex-col gap-6 p-6 md:p-8">
        <h2 className="type-h2">Profile</h2>
        <Input
          {...form.register("display_name")}
          label="First name"
          autoComplete="given-name"
          maxLength={40}
          placeholder="What should we call you?"
          error={form.formState.errors.display_name?.message}
        />
      </GlassCard>

      <GlassCard className="flex flex-col gap-8 p-6 md:p-8">
        <h2 className="type-h2">Focus preferences</h2>
        <Field id="s-goals" label="Goals">
          <Controller
            control={form.control}
            name="goals"
            render={({ field }) => (
              <ChipGroup
                type="multiple"
                aria-labelledby="s-goals"
                options={GOALS}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
        </Field>
        <Field id="s-when" label="When you usually work">
          <Controller
            control={form.control}
            name="work_style"
            render={({ field }) => (
              <ChipGroup
                type="single"
                aria-labelledby="s-when"
                options={WORK_STYLES}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
        </Field>
        <Field
          id="s-length"
          label="Focus length"
          hint={`${length.focus} minutes of focus, then a ${length.break}-minute break.`}
        >
          <Controller
            control={form.control}
            name="focus_length"
            render={({ field }) => (
              <ChipGroup
                type="single"
                aria-labelledby="s-length"
                options={FOCUS_LENGTHS}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
        </Field>
        <Field id="s-sound" label="Music styles">
          <Controller
            control={form.control}
            name="music_prefs"
            render={({ field }) => (
              <ChipGroup
                type="multiple"
                aria-labelledby="s-sound"
                options={MUSIC_STYLES}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
        </Field>
        <Field id="s-headphones" label="Headphones" hint="The binaural layer works best with them.">
          <Controller
            control={form.control}
            name="has_headphones"
            render={({ field }) => (
              <ChipGroup
                type="single"
                aria-labelledby="s-headphones"
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "Not usually" },
                ]}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
        </Field>
      </GlassCard>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={pending} className="sm:min-w-48">
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <div aria-live="polite" className="min-h-6">
          {result ? (
            result.ok ? (
              <p className="flex items-center gap-2 type-body-sm text-ink">
                <CheckCircle2 className="size-4 stroke-[1.5] text-blue-soft" aria-hidden="true" />{" "}
                {result.message}
              </p>
            ) : (
              <p role="alert" className="type-body-sm text-critical">
                {result.message}
              </p>
            )
          ) : null}
        </div>
      </div>
    </form>
  );
}
