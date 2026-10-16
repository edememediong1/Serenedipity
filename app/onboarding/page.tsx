import { redirect } from "next/navigation";

// The proxy sends signed-in users to the step they reached; this is a fallback.
export default function OnboardingIndex() {
  redirect("/onboarding/welcome");
}
