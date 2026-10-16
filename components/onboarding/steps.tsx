"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Headphones, ListChecks, LifeBuoy, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { finishOnboarding, saveOnboardingStep } from "@/app/onboarding/actions";
import { ChipGroup } from "@/components/ui/chip";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { stepPath, type OnboardingStep } from "@/lib/onboarding/steps";
import {
  FOCUS_LENGTHS,
  GOALS,
  MUSIC_STYLES,
  WORK_STYLES,
  ageSchema,
  focusLengthFor,
  goalsSchema,
  guideSchema,
  labelFor,
  rhythmSchema,
  soundSchema,
  welcomeSchema,
  type AgeValues,
  type GoalsValues,
  type GuideValues,
  type RhythmValues,
  type SoundValues,
  type WelcomeOutput,
  type WelcomeValues,
} from "@/lib/validation/onboarding";
import { OptionList } from "./option-list";
import { StepFrame } from "./step-frame";

/** The profile fields onboarding reads. Passed from the server. */
export type OnboardingProfile = {
  display_name: string | null;
  age_confirmed: boolean;
  goals: string[];
  work_style: string | null;
  default_focus_minutes: number;
  music_prefs: string[];
  has_headphones: boolean | null;
  ai_guide_consent: boolean;
};

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function useStepAction(step: OnboardingStep) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (input: unknown, skip = false) =>
    startTransition(async () => {
      setError(null);
      try {
        const result = await saveOnboardingStep(step, input, skip);
        if (result && !result.ok) setError(result.message);
      } catch (actionError) {
        console.error("[onboarding] action request failed", actionError);
        setError("We couldn't continue just now. Refresh the page and try again.");
      }
    });
  return { pending, error, run };
}

const back = (index: number) => stepPath(index - 1);

function WelcomeStep({ profile }: { profile: OnboardingProfile }) {
  const { pending, error, run } = useStepAction("welcome");
  const form = useForm<WelcomeValues, unknown, WelcomeOutput>({
    resolver: zodResolver(welcomeSchema),
    defaultValues: { display_name: profile.display_name ?? "" },
  });
  return (
    <StepFrame
      eyebrow="Welcome"
      title={
        <>
          Let&apos;s set up your <em>space</em>.
        </>
      }
      description="A few quick questions so it feels like yours. You can change any of it later."
      pending={pending}
      error={error}
      onSubmit={form.handleSubmit((v) => run({ ...v, timezone: browserTimezone() }))}
    >
      <Input
        {...form.register("display_name")}
        label="What should we call you?"
        description="Your first name is plenty. This is optional."
        autoComplete="given-name"
        placeholder="First name"
        maxLength={40}
        error={form.formState.errors.display_name?.message}
      />
    </StepFrame>
  );
}

function AgeStep({ profile }: { profile: OnboardingProfile }) {
  const { pending, error, run } = useStepAction("age");
  const form = useForm<AgeValues>({
    resolver: zodResolver(ageSchema),
    defaultValues: { answer: profile.age_confirmed ? "adult" : undefined },
  });
  return (
    <StepFrame
      eyebrow="About you"
      title={
        <>
          Are you <em>18</em> or older?
        </>
      }
      description="Focus rooms are for adults, so we ask everyone before they start."
      backHref={back(1)}
      pending={pending}
      error={error ?? form.formState.errors.answer?.message}
      onSubmit={form.handleSubmit((v) => run(v))}
    >
      <p id="age-label" className="sr-only">
        Your age
      </p>
      <Controller
        control={form.control}
        name="answer"
        render={({ field, fieldState }) => (
          <OptionList
            aria-labelledby="age-label"
            invalid={!!fieldState.error}
            value={field.value}
            onValueChange={field.onChange}
            options={[
              { value: "adult", label: "Yes, I'm 18 or older" },
              { value: "under18", label: "No, I'm under 18" },
            ]}
          />
        )}
      />
    </StepFrame>
  );
}

function GoalsStep({ profile }: { profile: OnboardingProfile }) {
  const { pending, error, run } = useStepAction("goals");
  const form = useForm<GoalsValues>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      goals: profile.goals.filter((g) => GOALS.some((o) => o.value === g)) as GoalsValues["goals"],
    },
  });
  return (
    <StepFrame
      eyebrow="Your goals"
      title={
        <>
          What brings you <em>here</em>?
        </>
      }
      description="Pick any that fit. We'll use them to shape your plans and picks."
      backHref={back(2)}
      onSkip={() => run({}, true)}
      pending={pending}
      error={error ?? form.formState.errors.goals?.message}
      onSubmit={form.handleSubmit((v) => run(v))}
    >
      <p id="goals-label" className="sr-only">
        Goals, choose any
      </p>
      <Controller
        control={form.control}
        name="goals"
        render={({ field }) => (
          <ChipGroup
            type="multiple"
            aria-labelledby="goals-label"
            options={GOALS}
            value={field.value}
            onValueChange={field.onChange}
          />
        )}
      />
    </StepFrame>
  );
}

function RhythmStep({ profile }: { profile: OnboardingProfile }) {
  const { pending, error, run } = useStepAction("rhythm");
  const form = useForm<RhythmValues>({
    resolver: zodResolver(rhythmSchema),
    defaultValues: {
      work_style: (WORK_STYLES.find((w) => w.value === profile.work_style)?.value ??
        undefined) as RhythmValues["work_style"],
      focus_length: focusLengthFor(profile.default_focus_minutes).value,
    },
  });
  const selected = focusLengthFor(Number(useWatch({ control: form.control, name: "focus_length" })));
  const errors = form.formState.errors;
  return (
    <StepFrame
      eyebrow="Your rhythm"
      title={
        <>
          Find your <em>rhythm</em>
        </>
      }
      description="We'll suggest sessions that match how you like to work."
      backHref={back(3)}
      onSkip={() => run({}, true)}
      pending={pending}
      error={error ?? errors.work_style?.message ?? errors.focus_length?.message}
      onSubmit={form.handleSubmit((v) => run(v))}
    >
      <div className="flex flex-col gap-3">
        <h2 id="when-label" className="type-h3">
          When do you usually work?
        </h2>
        <Controller
          control={form.control}
          name="work_style"
          render={({ field }) => (
            <ChipGroup
              type="single"
              aria-labelledby="when-label"
              options={WORK_STYLES}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
      </div>
      <div className="flex flex-col gap-3">
        <h2 id="length-label" className="type-h3">
          How long do you like to focus?
        </h2>
        <Controller
          control={form.control}
          name="focus_length"
          render={({ field }) => (
            <ChipGroup
              type="single"
              aria-labelledby="length-label"
              aria-describedby="length-break"
              options={FOCUS_LENGTHS}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
        <p id="length-break" className="type-body-sm text-ink-muted" aria-live="polite">
          {selected.focus} minutes of focus, then a {selected.break}-minute break.
        </p>
      </div>
    </StepFrame>
  );
}

function SoundStep({ profile }: { profile: OnboardingProfile }) {
  const { pending, error, run } = useStepAction("sound");
  const form = useForm<SoundValues>({
    resolver: zodResolver(soundSchema),
    defaultValues: {
      music_prefs: profile.music_prefs.filter((m) =>
        MUSIC_STYLES.some((o) => o.value === m),
      ) as SoundValues["music_prefs"],
      has_headphones: profile.has_headphones === null ? undefined : profile.has_headphones ? "yes" : "no",
    },
  });
  const errors = form.formState.errors;
  return (
    <StepFrame
      eyebrow="Your sound"
      title={
        <>
          Choose your <em>sound</em>
        </>
      }
      description="Pick the styles you like to work to. You'll find all of them in the library."
      backHref={back(4)}
      onSkip={() => run({}, true)}
      pending={pending}
      error={error ?? errors.music_prefs?.message ?? errors.has_headphones?.message}
      onSubmit={form.handleSubmit((v) => run(v))}
    >
      <div className="flex flex-col gap-3">
        <h2 id="music-label" className="type-h3">
          Music styles
        </h2>
        <Controller
          control={form.control}
          name="music_prefs"
          render={({ field }) => (
            <ChipGroup
              type="multiple"
              aria-labelledby="music-label"
              options={MUSIC_STYLES}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
      </div>
      <div className="flex flex-col gap-3">
        <h2 id="headphones-label" className="type-h3">
          Do you use headphones?
        </h2>
        <p id="headphones-hint" className="flex items-center gap-2 type-body-sm text-ink-muted">
          <Headphones className="size-4 stroke-[1.5]" aria-hidden="true" />
          The binaural layer works best with them.
        </p>
        <Controller
          control={form.control}
          name="has_headphones"
          render={({ field }) => (
            <ChipGroup
              type="single"
              aria-labelledby="headphones-label"
              aria-describedby="headphones-hint"
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "Not usually" },
              ]}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
      </div>
    </StepFrame>
  );
}

function GuideStep({ profile }: { profile: OnboardingProfile }) {
  const { pending, error, run } = useStepAction("guide");
  const form = useForm<GuideValues>({
    resolver: zodResolver(guideSchema),
    defaultValues: { consent: (profile.ai_guide_consent || undefined) as true | undefined },
  });
  const consentError = form.formState.errors.consent?.message;
  return (
    <StepFrame
      eyebrow="Your focus guide"
      title={
        <>
          Meet your focus <em>guide</em>
        </>
      }
      description="An AI that turns how you feel and what's due into a plan you can start on."
      backHref={back(5)}
      submitLabel="Continue"
      pending={pending}
      error={error}
      onSubmit={form.handleSubmit((v) => run(v))}
    >
      <GlassCard className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 type-h3">
          <Sparkles className="size-[18px] stroke-[1.5] text-blue-soft" aria-hidden="true" /> What it does
        </h2>
        <ul className="flex flex-col gap-2 text-ink-muted">
          <li>Listens to how you&apos;re feeling and what you need to get done.</li>
          <li>Helps you break the work into small steps and plan your blocks.</li>
          <li>Keeps you on track, and re-plans when you get stuck.</li>
        </ul>
      </GlassCard>
      <GlassCard className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 type-h3">
          <LifeBuoy className="size-[18px] stroke-[1.5] text-blue-soft" aria-hidden="true" /> What it
          isn&apos;t
        </h2>
        <ul className="flex flex-col gap-2 text-ink-muted">
          <li>It isn&apos;t a person, and it isn&apos;t a medical or mental health service.</li>
          <li>If you ever need more support, it points you to real people and resources who can help.</li>
        </ul>
      </GlassCard>
      <Controller
        control={form.control}
        name="consent"
        render={({ field }) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={field.value === true}
                onCheckedChange={(c) => field.onChange(c === true ? true : undefined)}
                aria-invalid={consentError ? true : undefined}
                aria-describedby={consentError ? "consent-error" : undefined}
                className="mt-0.5"
              />
              <label htmlFor="consent" className="cursor-pointer">
                I understand the focus guide is an AI that helps me plan my work, not a medical or mental
                health service.
              </label>
            </div>
            {consentError ? (
              <p id="consent-error" role="alert" className="type-body-sm text-critical">
                {consentError}
              </p>
            ) : null}
          </div>
        )}
      />
    </StepFrame>
  );
}

function DoneStep({ profile }: { profile: OnboardingProfile }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const length = focusLengthFor(profile.default_focus_minutes);
  const rows = [
    { label: "Name", value: profile.display_name || "Not set" },
    {
      label: "Goals",
      value: profile.goals.length ? profile.goals.map((g) => labelFor(GOALS, g)).join(", ") : "Not set",
    },
    {
      label: "Usually works",
      value: profile.work_style ? labelFor(WORK_STYLES, profile.work_style) : "Not set",
    },
    { label: "Focus blocks", value: `${length.focus} min focus, ${length.break} min break` },
    {
      label: "Sound",
      value: profile.music_prefs.length
        ? profile.music_prefs.map((m) => labelFor(MUSIC_STYLES, m)).join(", ")
        : "Not set",
    },
    {
      label: "Headphones",
      value: profile.has_headphones === null ? "Not set" : profile.has_headphones ? "Yes" : "Not usually",
    },
  ];

  return (
    <StepFrame
      eyebrow="All set"
      title={
        <>
          Your space is <em>ready</em>
          {profile.display_name ? `, ${profile.display_name}` : ""}.
        </>
      }
      description="Here's what we'll start with. You can change any of it in Settings."
      backHref={back(6)}
      submitLabel="Go to my space"
      pending={pending}
      error={error}
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setError(null);
          try {
            const r = await finishOnboarding({ timezone: browserTimezone() });
            if (r && !r.ok) setError(r.message);
          } catch (actionError) {
            console.error("[onboarding] finish request failed", actionError);
            setError("We couldn't open your space just now. Refresh the page and try again.");
          }
        });
      }}
    >
      <GlassCard>
        <dl className="flex flex-col divide-y divide-line">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <dt className="text-ink-muted">{row.label}</dt>
              <dd className="text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
      </GlassCard>
      <p className="flex items-center gap-2 type-body-sm text-ink-muted">
        <ListChecks className="size-4 stroke-[1.5]" aria-hidden="true" />
        Next: check in with your focus guide, or just press play.
      </p>
    </StepFrame>
  );
}

const STEP_COMPONENTS: Record<OnboardingStep, (p: { profile: OnboardingProfile }) => React.ReactNode> = {
  welcome: WelcomeStep,
  age: AgeStep,
  goals: GoalsStep,
  rhythm: RhythmStep,
  sound: SoundStep,
  guide: GuideStep,
  done: DoneStep,
};

export function OnboardingStepView({ step, profile }: { step: OnboardingStep; profile: OnboardingProfile }) {
  const Step = STEP_COMPONENTS[step];
  return <Step profile={profile} />;
}
