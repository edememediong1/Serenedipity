import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type GlassCardProps = ComponentProps<"div"> & {
  asChild?: boolean;
  /** Padding preset: 16px on mobile and 24px from md up by default. */
  padding?: "none" | "sm" | "md";
};

/** Frosted card: rgba(255,255,255,0.06), 1px line border, 20px blur, 28px radius. */
export function GlassCard({ className, asChild, padding = "md", ...props }: GlassCardProps) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="glass-card"
      className={cn(
        "rounded-lg text-ink glass",
        padding === "md" && "p-4 md:p-6",
        padding === "sm" && "p-4",
        className,
      )}
      {...props}
    />
  );
}
