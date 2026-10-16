import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { EmailHint } from "./email-hint";

export const metadata: Metadata = { title: "Check your email", robots: { index: false } };

export default function CheckEmailPage() {
  return (
    <AuthShell
      eyebrow="Almost there"
      title={
        <>
          Check your <em>inbox</em>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <span className="flex size-14 items-center justify-center rounded-pill text-on-brand bg-gradient-orb">
          <MailCheck className="size-6 stroke-[1.5]" aria-hidden="true" />
        </span>
        <EmailHint />
        <p className="text-ink-muted">
          The link works once and expires after an hour. You can open it on any device. If it hasn&apos;t
          arrived in a minute or two, check spam or promotions.
        </p>
        <Button asChild variant="secondary" block>
          <Link href="/login">Use a different email</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
