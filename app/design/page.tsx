import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Headphones, Mic, Sparkles } from "lucide-react";
import tokens from "@/design/tokens.json";
import { GlowBackground } from "@/components/brand/glow-background";
import { Logo } from "@/components/brand/logo";
import { ProgressRing } from "@/components/brand/progress-ring";
import { SignatureOrb } from "@/components/brand/signature-orb";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { ChipDemo, GlowDemo } from "./demos";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="type-h2">{title}</h2>
      {children}
    </section>
  );
}

/** Development-only gallery of every token and primitive. Returns 404 in production. */
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const typeStyles = [
    ["type-hero", "Find your focus", true],
    ["type-h1", "Today's plan", true],
    ["type-h2", "Choose a state", false],
    ["type-h3", "How are you feeling?", false],
    ["type-body", "Talk for 20 seconds. Get a plan for today.", false],
    ["type-body-sm", "Calm · 60 min", false],
    ["type-eyebrow", "Picked for you", false],
  ] as const;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
      <GlowBackground />
      <header className="flex flex-col gap-4">
        <Logo />
        <Eyebrow>Development only</Eyebrow>
        <h1 className="type-hero md:type-hero-lg">
          Design <em>system</em>
        </h1>
        <p className="max-w-prose text-ink-muted">
          Every token from design/tokens.json and every primitive, as built. Check these against the reference
          screens before we build pages.
        </p>
      </header>

      <Section title="Colour tokens (Night)">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tokens.color.tokens.map((token) => (
            <li key={token.name}>
              <GlassCard padding="sm" className="flex items-center gap-3">
                <span
                  className="size-10 shrink-0 rounded-sm border border-line"
                  style={{ background: `var(--color-${token.name})` }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block type-body-sm">{token.name}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {typeof token.value === "string" ? token.value : token.value.dark}
                  </span>
                </span>
              </GlassCard>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Gradients">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            ["Primary", "bg-gradient-primary"],
            ["Signature orb", "bg-gradient-orb"],
            ["State: Focus", "bg-state-focus"],
            ["State: Calm", "bg-state-calm"],
            ["State: Clear", "bg-state-clear"],
          ].map(([name, cls]) => (
            <div key={name} className={`${cls} flex h-24 items-end rounded-lg p-3 text-on-brand type-body-sm`}>
              {name}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Background glow moods">
        <GlowDemo />
      </Section>

      <Section title="Typography">
        <GlassCard className="flex flex-col gap-4">
          {typeStyles.map(([cls, sample, serif]) => (
            <div key={cls} className="flex flex-col gap-1 border-b border-line pb-4 last:border-0 last:pb-0">
              <span className="text-xs text-ink-muted">{cls}</span>
              <span className={cls}>
                {serif ? (
                  <>
                    {sample.split(" ").slice(0, -1).join(" ")} <em>{sample.split(" ").at(-1)}</em>
                  </>
                ) : (
                  sample
                )}
              </span>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">type-timer</span>
            <span className="type-timer">18:42</span>
          </div>
        </GlassCard>
      </Section>

      <Section title="Spacing and radius">
        <div className="flex flex-wrap items-end gap-4">
          {tokens.spacing.tokens.map((t) => (
            <div key={t.name} className="flex flex-col items-center gap-2">
              <span className="bg-gradient-orb block rounded-sm" style={{ width: t.value, height: t.value }} />
              <span className="text-xs text-ink-muted">
                {t.name} · {t.value}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {tokens.radius.tokens.map((t) => (
            <div key={t.name} className="flex flex-col items-center gap-2">
              <span className="glass block size-20" style={{ borderRadius: t.value }} />
              <span className="text-xs text-ink-muted">
                {t.name} · {t.value}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Start free</Button>
          <Button variant="secondary">Join the waitlist</Button>
          <Button variant="ghost">Log in</Button>
          <Button variant="solid">Leave room</Button>
          <Button size="lg">Start with a 2-minute reset</Button>
          <Button size="sm" variant="secondary">
            <Sparkles aria-hidden="true" /> Small
          </Button>
          <Button size="icon" variant="secondary" aria-label="Headphones">
            <Headphones aria-hidden="true" />
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Chips">
        <ChipDemo />
      </Section>

      <Section title="Inputs">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Email" type="email" placeholder="you@example.com" description="We only email you about launch." />
          <Input label="First name" defaultValue="Ada" error="That doesn't look quite right." />
        </div>
      </Section>

      <Section title="Glass card, orb and progress ring">
        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard className="flex items-center gap-4">
            <SignatureOrb size={64} halo icon={<Mic className="size-6" aria-hidden="true" />} />
            <div>
              <p className="type-h2">How are you feeling?</p>
              <p className="text-ink-muted">Talk for 20 seconds. Get a plan for today.</p>
            </div>
          </GlassCard>
          <GlassCard className="flex items-center justify-center">
            <ProgressRing value={0.25} size={180} strokeWidth={6} label="Focus block" valueText="18 of 25 minutes left">
              <span className="text-center">
                <span className="block text-5xl font-extralight tabular-nums">18:42</span>
                <span className="text-ink-muted type-body-sm">of 25 minutes</span>
              </span>
            </ProgressRing>
          </GlassCard>
          <GlassCard className="flex flex-col items-start gap-4">
            <Logo href={null} />
            <Logo href={null} size="sm" />
            <SignatureOrb size={40} />
          </GlassCard>
        </div>
      </Section>
    </main>
  );
}
