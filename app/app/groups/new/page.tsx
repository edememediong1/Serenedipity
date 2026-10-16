import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createGroup } from "@/app/app/groups/actions";
import { GlowBackground } from "@/components/brand/glow-background";
import { GroupForm } from "@/components/groups/group-form";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { isAdmin } from "@/lib/auth/admin";
import { getSessionProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Start a group" };

async function NewGroup() {
  const { user, profile } = await getSessionProfile();
  if (!isAdmin(profile, user.email) && profile.plan !== "premium")
    return (
      <GlassCard className="flex flex-col gap-4 p-6">
        <p>Starting study groups is part of Pro.</p>
        <Button asChild className="w-fit">
          <Link href="/app/upgrade">See Pro</Link>
        </Button>
      </GlassCard>
    );
  return (
    <GlassCard className="p-5 md:p-8">
      <GroupForm create={createGroup} />
    </GlassCard>
  );
}

export default function NewGroupPage() {
  return (
    <>
      <GlowBackground mood="rooms" />
      <div className="mx-auto flex max-w-2xl animate-rise-in flex-col gap-6">
        <Link
          href="/app/groups"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-sm type-body-sm text-ink-muted focus-ring hover:text-ink"
        >
          <ArrowLeft className="size-4 stroke-[1.5]" aria-hidden="true" /> All groups
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="type-h1 md:text-[48px] md:leading-[52px]">
            Start a <em>group</em>
          </h1>
          <p className="text-ink-muted">You&apos;ll be the owner. You can add moderators once people join.</p>
        </div>
        <Suspense
          fallback={<div role="status" aria-label="Loading" className="h-96 rounded-lg bg-surface-deep/60" />}
        >
          <NewGroup />
        </Suspense>
      </div>
    </>
  );
}
