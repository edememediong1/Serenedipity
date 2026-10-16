"use client";

import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative size-6 shrink-0 rounded-[8px] border border-line bg-surface-deep focus-ring transition-colors duration-300",
        "before:absolute before:-inset-2.5 before:content-['']", // 44px touch target
        "aria-invalid:border-critical data-[state=checked]:border-transparent data-[state=checked]:[background:var(--gradient-primary)]",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-on-brand">
        <Check className="size-4 stroke-[2]" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
