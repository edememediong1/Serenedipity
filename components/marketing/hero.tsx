import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { APP_DESCRIPTION } from "@/lib/config";
import { PhoneMockup } from "./phone-mockup";

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="px-6 pt-8 pb-16 md:pt-16 md:pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div className="flex animate-rise-in flex-col items-start gap-6">
          <Eyebrow>Focus music, a plan, and company</Eyebrow>
          <h1 id="hero-heading" className="type-hero md:type-hero-lg">
            Clear head.
            <br />
            Deep <em>work</em>.
          </h1>
          <p className="max-w-md text-ink-muted md:text-[17px] md:leading-[26px]">{APP_DESCRIPTION}</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Start free <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="#waitlist">Join the waitlist</Link>
            </Button>
          </div>
          <p className="type-body-sm text-ink-muted">Free plan available. No card needed to start.</p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
