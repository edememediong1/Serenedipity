import type { Metadata } from "next";
import { signOut } from "@/app/(auth)/actions";
import { SignatureOrb } from "@/components/brand/signature-orb";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Not available yet", robots: { index: false } };

export default function NotAvailablePage() {
  return (
    <div className="flex flex-1 animate-rise-in flex-col gap-6">
      <SignatureOrb size={56} aria-hidden="true" />
      <Eyebrow>Thanks for telling us</Eyebrow>
      <h1 className="type-hero">
        Not quite <em>yet</em>
      </h1>
      <p className="max-w-md text-ink-muted md:text-base">
        {APP_NAME} is for people 18 and older for now, so we can&apos;t set up your space today. We&apos;d
        love to see you when you&apos;re 18.
      </p>
      <p className="max-w-md text-ink-muted">
        If you&apos;re having a hard time and want to talk to someone, a parent, teacher or another adult you
        trust is a good place to start.
      </p>
      <form action={signOut} className="mt-auto pt-8">
        <Button type="submit" variant="secondary" size="lg" block>
          Sign out
        </Button>
      </form>
    </div>
  );
}
