import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { GlowBackground, type GlowMood } from "@/components/brand/glow-background";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassCard } from "@/components/ui/glass-card";

type ComingSoonProps = {
  mood: GlowMood;
  eyebrow: string;
  title: ReactNode;
  description: string;
  icon: LucideIcon;
  /** What will live here, in the product's words. */
  upcoming: string[];
  children?: ReactNode;
};

/** Elegant empty state for sections that ship in later phases. */
export function ComingSoon({
  mood,
  eyebrow,
  title,
  description,
  icon: Icon,
  upcoming,
  children,
}: ComingSoonProps) {
  return (
    <>
      <GlowBackground mood={mood} />
      <div className="flex animate-rise-in flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="type-hero md:text-[60px] md:leading-[62px]">{title}</h1>
          <p className="max-w-lg text-ink-muted md:text-base">{description}</p>
        </div>
        {children}
        <GlassCard className="flex max-w-2xl flex-col gap-5 p-6 md:p-8">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-pill text-on-brand bg-gradient-orb">
              <Icon className="size-5 stroke-[1.5]" aria-hidden="true" />
            </span>
            <div>
              <p className="type-h2">Coming soon</p>
              <p className="type-body-sm text-ink-muted">We&apos;re putting the finishing touches on this.</p>
            </div>
          </div>
          <ul className="flex flex-col gap-2.5">
            {upcoming.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-pill bg-blue-soft" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="secondary" className="w-fit">
            <Link href="/app">
              <ArrowLeft aria-hidden="true" /> Back to home
            </Link>
          </Button>
        </GlassCard>
      </div>
    </>
  );
}
