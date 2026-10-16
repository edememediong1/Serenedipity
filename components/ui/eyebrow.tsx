import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Small label above a heading. Sentence case, 0.08em tracking. */
export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="eyebrow" className={cn("type-eyebrow text-ink-muted", className)} {...props} />;
}
