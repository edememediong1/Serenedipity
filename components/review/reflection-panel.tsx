"use client";

import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { getWeeklyReflection, type ReflectionResult } from "@/app/app/review/actions";
import { LunaBadge } from "@/components/luna/luna-badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { GUIDE_NAME } from "@/lib/config";

export function ReflectionPanel({ endDate, canUse }: { endDate: string; canUse: boolean }) {
  const [result, setResult] = useState<ReflectionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const load = (refresh = false) =>
    startTransition(async () => setResult(await getWeeklyReflection(endDate, refresh)));

  return (
    <GlassCard className="flex flex-col gap-4 p-5 md:p-6" role="region" aria-labelledby="reflection-heading">
      <LunaBadge />
      <h2 id="reflection-heading" className="type-h2">
        Your weekly reflection
      </h2>
      {!canUse ? (
        <>
          <p className="text-ink-muted">
            With Pro, {GUIDE_NAME} reads your week&apos;s numbers (never your check-ins) and writes a short
            reflection: what went well, what to adjust, and one small idea for next week.
          </p>
          <Button asChild className="w-fit">
            <Link href="/app/upgrade">
              <Sparkles aria-hidden="true" /> Upgrade to Pro
            </Link>
          </Button>
        </>
      ) : !result ? (
        <Button className="w-fit" disabled={pending} onClick={() => load()}>
          <Sparkles aria-hidden="true" />{" "}
          {pending ? `${GUIDE_NAME} is reading your week…` : `Ask ${GUIDE_NAME} to reflect`}
        </Button>
      ) : result.ok ? (
        <div className="flex flex-col gap-4" aria-live="polite">
          <p className="font-display text-[28px] leading-8">{result.reflection.headline}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 type-h3">Went well</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-ink-muted">
                {result.reflection.went_well.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 type-h3">To adjust</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-ink-muted">
                {result.reflection.to_improve.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="rounded-md border border-line bg-surface-glass p-3">
            <span className="block type-body-sm text-ink-muted">For next week</span>
            {result.reflection.next_week}
          </p>
          <Button variant="ghost" size="sm" className="w-fit" disabled={pending} onClick={() => load(true)}>
            <RefreshCw aria-hidden="true" /> Write a fresh one
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p className="text-ink-muted">{result.message}</p>
          {result.code === "upgrade" ? (
            <Button asChild className="w-fit">
              <Link href="/app/upgrade">Upgrade to Pro</Link>
            </Button>
          ) : (
            <Button variant="secondary" className="w-fit" onClick={() => load()}>
              Try again
            </Button>
          )}
        </div>
      )}
    </GlassCard>
  );
}
