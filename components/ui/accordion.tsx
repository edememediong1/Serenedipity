"use client";

import { Accordion as AccordionPrimitive } from "radix-ui";
import { Plus } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item className={cn("border-b border-line last:border-b-0", className)} {...props} />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex min-h-14 flex-1 items-center justify-between gap-4 rounded-md py-4 text-left type-h3 text-ink focus-ring",
          className,
        )}
        {...props}
      >
        {children}
        <Plus
          className="size-5 shrink-0 stroke-[1.5] text-ink-muted transition-transform duration-300 ease-out group-data-[state=open]:rotate-45"
          aria-hidden="true"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content className="overflow-hidden data-[state=open]:animate-fade-in" {...props}>
      <div className={cn("pb-5 text-ink-muted", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
