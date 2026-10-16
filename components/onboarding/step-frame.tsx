"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

type StepFrameProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  backHref?: string;
  onSkip?: () => void;
  submitLabel?: string;
  pending?: boolean;
  error?: string | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

/**
 * One question per screen: heading, content, and a footer with Back, Skip (optional) and the primary action.
 * Focus moves to the heading on arrival so screen readers announce the new question.
 */
export function StepFrame({
  eyebrow,
  title,
  description,
  children,
  backHref,
  onSkip,
  submitLabel = "Continue",
  pending,
  error,
  onSubmit,
}: StepFrameProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-1 animate-rise-in flex-col">
      <div className="flex flex-col gap-3">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="type-hero outline-none md:text-[60px] md:leading-[62px]"
        >
          {title}
        </h1>
        {description ? <p className="max-w-md text-ink-muted md:text-base">{description}</p> : null}
      </div>

      <div className="mt-10 flex flex-col gap-6">{children}</div>

      <div className="mt-auto flex flex-col gap-4 pt-12">
        {error ? (
          <p role="alert" className="type-body-sm text-critical">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <div className="flex min-h-11 items-center justify-between">
          {backHref ? (
            <Button asChild variant="ghost" size="sm" className="-ml-3">
              <Link href={backHref}>
                <ArrowLeft aria-hidden="true" /> Back
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {onSkip ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mr-3 text-ink-muted"
              onClick={onSkip}
              disabled={pending}
            >
              Skip for now
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
