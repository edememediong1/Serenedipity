import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SupportResources } from "@/components/luna/support-resources";
import { GlowBackground } from "@/components/brand/glow-background";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GUIDE_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <>
      <GlowBackground mood="check-in" drift={false} />
      <div className="flex max-w-2xl animate-rise-in flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Eyebrow>Support</Eyebrow>
          <h1 className="type-hero md:text-[60px] md:leading-[62px]">
            You don&apos;t have to <em>carry it</em> alone
          </h1>
          <p className="text-ink-muted md:text-base">
            {GUIDE_NAME} can help you plan your work, but some things need a real person. If you&apos;re
            struggling, reach out to someone you trust, or to one of these free, confidential lines.
          </p>
        </header>
        <SupportResources />
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/app">
            <ArrowLeft aria-hidden="true" /> Back to home
          </Link>
        </Button>
      </div>
    </>
  );
}
