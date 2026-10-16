import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 rounded-md font-sans font-semibold whitespace-nowrap select-none",
    "transition-[transform,opacity,background-color,box-shadow,border-color] duration-300 ease-out",
    "focus-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:stroke-[1.5]",
  ],
  {
    variants: {
      variant: {
        /** Blue-to-violet gradient with the violet shadow. One per screen. */
        primary:
          "text-on-brand bg-gradient-primary hover:brightness-110 active:scale-[0.98] motion-reduce:active:scale-100",
        /** Frosted glass with a hairline border. */
        secondary: "text-ink glass hover:bg-white/10 active:scale-[0.98] motion-reduce:active:scale-100",
        /** Text-only, for low-emphasis actions. */
        ghost: "text-ink hover:bg-white/[0.06]",
        /** Solid ink pill, used sparingly (e.g. "Leave room"). */
        solid: "bg-ink text-surface hover:opacity-90",
      },
      size: {
        sm: "min-h-11 px-4 type-body-sm",
        md: "min-h-12 px-6 text-[15px] leading-[22px]",
        lg: "min-h-14 px-7 text-base leading-[22px]",
        icon: "size-11 rounded-pill p-0",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Link) with button styling. */
    asChild?: boolean;
  };

export function Button({ className, variant, size, block, asChild, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
}
