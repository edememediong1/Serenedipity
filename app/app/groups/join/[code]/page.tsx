import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { GlowBackground } from "@/components/brand/glow-background";
import { VISIBILITY_LABEL } from "@/components/groups/group-card";
import { JoinPanel } from "@/components/groups/join-panel";
import { GlassCard } from "@/components/ui/glass-card";
import { getSessionProfile } from "@/lib/auth/session";
import { getGroupByInvite } from "@/lib/groups/data";
import { TOPICS, type Topic } from "@/lib/groups/rules";

export const metadata: Metadata = { title: "Join a group", robots: { index: false } };

async function Invite({ params }: { params: PageProps<"/app/groups/join/[code]">["params"] }) {
  const { code } = await params;
  const { user, supabase } = await getSessionProfile();
  const group = await getGroupByInvite(code);
  if (!group) notFound();
  const { data: me } = await supabase
    .from("group_members")
    .select("status")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (me?.status === "active") redirect(`/app/groups/${group.slug}`);
  return (
    <GlassCard className="flex flex-col gap-4 p-6 md:p-8">
      <p className="type-body-sm text-ink-muted">You&apos;re invited to a study group</p>
      <h1 className="type-h1">{group.name}</h1>
      {group.description ? <p className="text-ink-muted">{group.description}</p> : null}
      <p className="type-body-sm text-ink-muted">
        {TOPICS[group.topic as Topic] ?? group.topic} · {VISIBILITY_LABEL[group.visibility]?.label} ·{" "}
        {group.member_count} {group.member_count === 1 ? "member" : "members"}
      </p>
      {group.rules ? (
        <div className="flex flex-col gap-1">
          <h2 className="type-h3">Group rules</h2>
          <p className="whitespace-pre-wrap text-ink-muted">{group.rules}</p>
        </div>
      ) : null}
      <JoinPanel
        groupId={group.id}
        visibility={group.visibility}
        status={(me?.status as "pending" | "banned") ?? null}
        role={null}
        code={code}
      />
      <Link href="/app/groups" className="w-fit rounded-sm type-body-sm text-ink-muted underline focus-ring">
        See all groups
      </Link>
    </GlassCard>
  );
}

export default function JoinGroupPage({ params }: PageProps<"/app/groups/join/[code]">) {
  return (
    <>
      <GlowBackground mood="rooms" />
      <div className="mx-auto max-w-xl animate-rise-in pt-4">
        <Suspense
          fallback={
            <div role="status" aria-label="Loading invite" className="h-72 rounded-lg bg-surface-deep/60" />
          }
        >
          <Invite params={params} />
        </Suspense>
      </div>
    </>
  );
}
