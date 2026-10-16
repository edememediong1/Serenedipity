import { GlowBackground } from "@/components/brand/glow-background";
import { Logo } from "@/components/brand/logo";
import { OnboardingProgress } from "@/components/onboarding/progress";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <GlowBackground mood="check-in" />
      <header className="mx-auto flex w-full max-w-xl flex-col gap-5 px-6 pt-6">
        <Logo href={null} size="sm" />
        <OnboardingProgress />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pt-10 pb-8 md:pt-16">
        {children}
      </main>
    </div>
  );
}
