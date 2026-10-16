import type { ReactNode } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Eyebrow } from "@/components/ui/eyebrow";

/** Placeholder shell for legal pages. Real copy needs legal review (PRD section 5). */
export function LegalPage({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="px-6 py-12 md:py-20">
      <GlassCard className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-10">
        <Eyebrow>Draft · awaiting legal review</Eyebrow>
        <h1 className="type-h1 md:text-[48px] md:leading-[52px]">{title}</h1>
        <div className="flex flex-col gap-4 text-ink-muted">{children}</div>
      </GlassCard>
    </div>
  );
}
