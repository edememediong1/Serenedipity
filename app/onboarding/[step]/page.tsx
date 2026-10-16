import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OnboardingStepView } from "@/components/onboarding/steps";
import { getSessionProfile } from "@/lib/auth/session";
import { isOnboardingStep, ONBOARDING_STEPS } from "@/lib/onboarding/steps";

export const metadata: Metadata = { title: "Set up your space", robots: { index: false } };

export function generateStaticParams() {
  return ONBOARDING_STEPS.map((step) => ({ step }));
}

export default function OnboardingStepPage({ params }: PageProps<"/onboarding/[step]">) {
  return (
    <Suspense fallback={<StepSkeleton />}>
      <StepLoader params={params} />
    </Suspense>
  );
}

async function StepLoader({ params }: { params: PageProps<"/onboarding/[step]">["params"] }) {
  const { step } = await params;
  if (!isOnboardingStep(step)) notFound();
  const { profile } = await getSessionProfile();

  return (
    <OnboardingStepView
      key={step}
      step={step}
      profile={{
        display_name: profile.display_name,
        age_confirmed: profile.age_confirmed,
        goals: profile.goals,
        work_style: profile.work_style,
        default_focus_minutes: profile.default_focus_minutes,
        music_prefs: profile.music_prefs,
        has_headphones: profile.has_headphones,
        ai_guide_consent: profile.ai_guide_consent,
      }}
    />
  );
}

function StepSkeleton() {
  return (
    <div role="status" className="flex flex-1 flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-24 rounded-sm bg-surface-deep" />
      <div className="h-24 w-4/5 rounded-md bg-surface-deep" />
      <div className="mt-8 h-14 rounded-md bg-surface-deep" />
    </div>
  );
}
