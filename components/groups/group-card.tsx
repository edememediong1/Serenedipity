import Link from "next/link";
import { Globe, Lock, ShieldCheck, Users } from "lucide-react";
import type { GroupSummary } from "@/lib/groups/data";
import { TOPICS, type Topic } from "@/lib/groups/rules";

export const VISIBILITY_LABEL: Record<string, { label: string; icon: typeof Globe }> = {
  public: { label: "Open to join", icon: Globe },
  request: { label: "Request to join", icon: ShieldCheck },
  private: { label: "Invite only", icon: Lock },
};

export function GroupCard({ group, badge }: { group: GroupSummary; badge?: string }) {
  const vis = VISIBILITY_LABEL[group.visibility] ?? VISIBILITY_LABEL.public;
  const Icon = vis.icon;
  return (
    <Link
      href={`/app/groups/${group.slug}`}
      className="flex h-full flex-col gap-3 rounded-lg p-5 focus-ring glass transition-colors hover:bg-white/[0.08] md:p-6"
    >
      <span className="flex items-center justify-between gap-3 type-body-sm text-ink-muted">
        <span>{TOPICS[group.topic as Topic] ?? group.topic}</span>
        {badge ? (
          <span className="rounded-pill border border-line px-2 py-0.5 text-[11px] font-semibold text-ink">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="type-h3">{group.name}</span>
      {group.description ? <span className="line-clamp-2 text-ink-muted">{group.description}</span> : null}
      <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 type-body-sm text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5 stroke-[1.5]" aria-hidden="true" /> {group.member_count}{" "}
          {group.member_count === 1 ? "member" : "members"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon className="size-3.5 stroke-[1.5]" aria-hidden="true" /> {vis.label}
        </span>
      </span>
    </Link>
  );
}
