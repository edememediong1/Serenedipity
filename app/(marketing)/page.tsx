import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { FinalCta } from "@/components/marketing/final-cta";
import { FocusTogether } from "@/components/marketing/focus-together";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingPlans } from "@/components/marketing/pricing";
import { Section } from "@/components/marketing/section";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <FocusTogether />
      <Section
        id="pricing"
        eyebrow="Pricing"
        align="center"
        title={
          <>
            Simple, <em>honest</em> pricing
          </>
        }
        intro="Start free. Upgrade when you want the full library, the binaural layer and every room."
      >
        <PricingPlans />
      </Section>
      <Faq />
      <FinalCta />
    </>
  );
}
