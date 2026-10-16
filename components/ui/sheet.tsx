"use client";

import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

export function SheetContent({
  className,
  children,
  side = "top",
  ...props
}: ComponentProps<typeof SheetPrimitive.Content> & { side?: "top" | "right" }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-surface/70 backdrop-blur-sm data-[state=open]:animate-fade-in" />
      <SheetPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col gap-6 bg-surface-deep/95 p-6 text-ink shadow-2xl glass outline-none data-[state=open]:animate-rise-in",
          side === "top" && "inset-x-3 top-3 rounded-lg",
          side === "right" && "inset-y-3 right-3 w-[min(22rem,calc(100vw-1.5rem))] rounded-lg",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className="absolute top-4 right-4 inline-flex size-11 items-center justify-center rounded-pill text-ink-muted focus-ring hover:bg-white/[0.06] hover:text-ink"
          aria-label="Close menu"
        >
          <X className="size-5 stroke-[1.5]" aria-hidden="true" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("type-h2", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn("text-ink-muted", className)} {...props} />;
}
