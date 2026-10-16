/** Onboarding steps in order. The index matches profiles.onboarding_step. */
export const ONBOARDING_STEPS = ["welcome", "age", "goals", "rhythm", "sound", "guide", "done"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const NOT_AVAILABLE_PATH = "/onboarding/not-available";

export function stepIndex(step: string): number {
  return ONBOARDING_STEPS.indexOf(step as OnboardingStep);
}

export function stepPath(index: number): string {
  const clamped = Math.min(Math.max(index, 0), ONBOARDING_STEPS.length - 1);
  return `/onboarding/${ONBOARDING_STEPS[clamped]}`;
}

export function isOnboardingStep(step: string): step is OnboardingStep {
  return stepIndex(step) !== -1;
}
