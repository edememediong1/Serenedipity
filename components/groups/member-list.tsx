"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { manageMember } from "@/app/app/groups/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { canActOn, type GroupRole } from "@/lib/groups/rules";
import { initials } from "@/lib/rooms/access";
import { ReportDialog, type ReportTarget } from "./report-dialog";

type Member = { user_id: string; role: string; status: string; name: string; muted_until: string | null };
type Action = Parameters<typeof manageMember>[0]["action"];

const ROLE_LABEL: Record<string, string> = { owner: "Owner", moderator: "Moderator", member: "Member" };

/** Members, with role-aware actions. Moderators also see pending requests and bans. */
export function MemberList({
  members,
  groupId,
  viewerId,
  viewerRole,
  now,
}: {
  members: Member[];
  groupId: string;
  viewerId: string;
  viewerRole: GroupRole | null;
  now: number;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [pending, start] = useTransition();
  const run = (userId: string, action: Action) =>
    start(async () => {
      const res = await manageMember({ groupId, userId, action });
      setMsg(res.ok ? null : res.message);
    });

  const sections = [
    { key: "pending", title: "Requests to join", list: members.filter((m) => m.status === "pending") },
    { key: "active", title: "Members", list: members.filter((m) => m.status === "active") },
    { key: "banned", title: "Banned", list: members.filter((m) => m.status === "banned") },
  ].filter((s) => s.list.length);

  return (
    <div className="flex flex-col gap-6">
      {msg ? (
        <p role="alert" className="text-orange">
          {msg}
        </p>
      ) : null}
      {sections.map((s) => (
        <section key={s.key} aria-labelledby={`members-${s.key}`} className="flex flex-col gap-3">
          <h2 id={`members-${s.key}`} className="type-h3">
            {s.title} <span className="text-ink-muted">({s.list.length})</span>
          </h2>
          <ul className="flex flex-col rounded-lg px-4 glass">
            {s.list.map((m) => {
              const self = m.user_id === viewerId;
              const manageable = canActOn(viewerRole, m.role as GroupRole, self);
              const muted = m.muted_until && Date.parse(m.muted_until) > now;
              return (
                <li
                  key={m.user_id}
                  className="flex items-center gap-3 border-b border-line py-2.5 last:border-0"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-pill text-xs font-semibold text-on-brand bg-gradient-orb"
                  >
                    {initials(m.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{self ? `${m.name} (you)` : m.name}</span>
                    <span className="block type-body-sm text-ink-muted">
                      {ROLE_LABEL[m.role]}
                      {muted ? " · Muted for now" : ""}
                    </span>
                  </span>
                  {m.status === "pending" && manageable ? (
                    <span className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(m.user_id, "approve")}
                        className="min-h-11 rounded-md px-3 type-body-sm font-semibold text-blue-soft focus-ring hover:bg-white/[0.06]"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(m.user_id, "decline")}
                        className="min-h-11 rounded-md px-3 type-body-sm text-ink-muted focus-ring hover:bg-white/[0.06]"
                      >
                        Decline
                      </button>
                    </span>
                  ) : !self && (manageable || m.status === "active") ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Options for ${m.name}`}
                        className="flex size-11 items-center justify-center rounded-pill text-ink-muted focus-ring hover:bg-white/[0.06] hover:text-ink"
                      >
                        <MoreHorizontal className="size-5 stroke-[1.5]" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {m.status === "banned" && manageable ? (
                          <DropdownMenuItem onSelect={() => run(m.user_id, "unban")}>
                            Lift ban
                          </DropdownMenuItem>
                        ) : null}
                        {m.status === "active" && manageable ? (
                          <>
                            {viewerRole === "owner" && m.role === "member" ? (
                              <DropdownMenuItem onSelect={() => run(m.user_id, "promote")}>
                                Make moderator
                              </DropdownMenuItem>
                            ) : null}
                            {viewerRole === "owner" && m.role === "moderator" ? (
                              <DropdownMenuItem onSelect={() => run(m.user_id, "demote")}>
                                Remove as moderator
                              </DropdownMenuItem>
                            ) : null}
                            {viewerRole === "owner" ? (
                              <DropdownMenuItem
                                onSelect={() => {
                                  if (
                                    window.confirm(
                                      `Hand ownership of the group to ${m.name}? You'll become a moderator.`,
                                    )
                                  )
                                    run(m.user_id, "transfer");
                                }}
                              >
                                Make owner
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onSelect={() => run(m.user_id, muted ? "unmute" : "mute")}>
                              {muted ? "Unmute" : "Mute for 24 hours"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => run(m.user_id, "remove")}>
                              Remove from group
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                if (window.confirm(`Ban ${m.name}? They won't be able to rejoin.`))
                                  run(m.user_id, "ban");
                              }}
                            >
                              Ban
                            </DropdownMenuItem>
                          </>
                        ) : null}
                        {m.status === "active" ? (
                          <DropdownMenuItem
                            onSelect={() => setReport({ groupId, userId: m.user_id, name: m.name })}
                          >
                            Report
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <ReportDialog target={report} onClose={() => setReport(null)} />
    </div>
  );
}
