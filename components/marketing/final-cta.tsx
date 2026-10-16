import { SignatureOrb } from "@/components/brand/signature-orb";
import { GlassCard } from "@/components/ui/glass-card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { WaitlistForm } from "./waitlist-form";

export function FinalCta() {
  return (
    <section id="waitlist" aria-labelledby="waitlist-heading" className="scroll-mt-8 px-6 py-16 md:py-24">
      <GlassCard className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 overflow-hidden px-6 py-12 text-center md:px-16 md:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-32 mx-auto size-72 rounded-pill bg-violet/30 blur-3xl"
        />
        <SignatureOrb size={56} halo className="relative" aria-hidden="true" />
        <div className="relative flex flex-col items-center gap-3">
          <Eyebrow>Join the waitlist</Eyebrow>
          <h2 id="waitlist-heading" className="type-h1 md:text-[48px] md:leading-[52px]">
            Feeling foggy? Let&apos;s get you <em>moving</em>.
          </h2>
          <p className="max-w-md text-ink-muted">
            We&apos;re opening in small waves. Leave your email and we&apos;ll let you know when your spot is
            ready.
          </p>
        </div>
        <div className="relative w-full max-w-lg text-left">
          <WaitlistForm source="landing-final-cta" />
        </div>
      </GlassCard>
    </section>
  );
}
