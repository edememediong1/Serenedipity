import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  className?: string;
  align?: "left" | "center";
};

export function Section({ id, eyebrow, title, intro, children, className, align = "left" }: SectionProps) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("scroll-mt-8 px-6 py-16 md:py-24", className)}>
      <div className="mx-auto max-w-6xl">
        <div
          className={cn(
            "flex max-w-2xl flex-col gap-3",
            align === "center" && "mx-auto items-center text-center",
          )}
        >
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h2 id={headingId} className="type-h1 md:text-[48px] md:leading-[52px]">
            {title}
          </h2>
          {intro ? <p className="max-w-xl text-ink-muted md:text-base">{intro}</p> : null}
        </div>
        {children ? <div className="mt-10 md:mt-12">{children}</div> : null}
      </div>
    </section>
  );
}
