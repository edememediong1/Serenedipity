import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { GlassCard } from "@/components/ui/glass-card";
import { Eyebrow } from "@/components/ui/eyebrow";

type AuthShellProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col px-6">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center">
        <Logo />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center pt-6 pb-16 md:items-center md:pt-0">
        <div className="w-full max-w-md animate-rise-in">
          <div className="mb-8 flex flex-col gap-3">
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <h1 className="type-hero">{title}</h1>
            {description ? <p className="text-ink-muted">{description}</p> : null}
          </div>
          <GlassCard className="p-6 md:p-8">{children}</GlassCard>
          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
