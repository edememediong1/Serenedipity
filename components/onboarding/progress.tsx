"use client";

import { usePathname } from "next/navigation";
import { ONBOARDING_STEPS, stepIndex } from "@/lib/onboarding/steps";

/** Slim gradient progress bar driven by the current step in the URL. */
export function OnboardingProgress() {
  const pathname = usePathname();
  const index = stepIndex(pathname.split("/")[2] ?? "");
  if (index === -1) return null;
  const total = ONBOARDING_STEPS.length;
  const value = Math.round(((index + 1) / total) * 100);
  return (
    <div
      role="progressbar"
      aria-label="Setup progress"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={index + 1}
      aria-valuetext={`Step ${index + 1} of ${total}`}
      className="h-1 w-full overflow-hidden rounded-pill bg-track"
    >
      <div
        className="h-full rounded-pill transition-[width] duration-500 ease-out [background:linear-gradient(90deg,var(--gradient-ring-from),var(--gradient-ring-to))]"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
