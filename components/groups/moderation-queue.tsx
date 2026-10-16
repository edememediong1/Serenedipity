"use client";

import { useState, useTransition } from "react";
import { resolveGroupReport, updateComment, updatePost } from "@/app/app/groups/actions";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { HELD_LABELS } from "@/lib/groups/moderation";
import { REPORT_REASONS } from "@/lib/rooms/validation";
import { timeAgo } from "./time-ago";

type Held = { id: string; author: string; body: string; held_reason: string | null; created_at: string };
type Report = {
  id: string;
  reporter: string;
  reported: string;
  reason: string;
  details: string | null;
  content: string | null;
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
};

/** Moderators' queue: content the screen held back, and reports about this group. */
export function ModerationQueue({
  heldPosts,
  heldComments,
  reports,
  now,
}: {
  heldPosts: Held[];
  heldComments: Held[];
  reports: Report[];
  now: number;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg(res.ok ? null : (res.message ?? "Something went wrong."));
    });
  const held = [
    ...heldPosts.map((h) => ({ ...h, type: "post" as const })),
    ...heldComments.map((h) => ({ ...h, type: "comment" as const })),
  ];

  return (
    <div className="flex flex-col gap-8">
      {msg ? (
        <p role="alert" className="text-orange">
          {msg}
        </p>
      ) : null}
      <section aria-labelledby="held-heading" className="flex flex-col gap-3">
        <h2 id="held-heading" className="type-h3">
          Held for review <span className="text-ink-muted">({held.length})</span>
        </h2>
        {held.length === 0 ? (
          <p className="text-ink-muted">
            Nothing waiting. The automatic screen holds posts that look abusive or spammy.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {held.map((h) => (
              <li key={h.id}>
                <GlassCard className="flex flex-col gap-2 p-4">
                  <p className="type-body-sm text-ink-muted">
                    {h.type === "post" ? "Post" : "Comment"} by {h.author} · {timeAgo(h.created_at, now)}
                    {h.held_reason ? ` · ${HELD_LABELS[h.held_reason] ?? h.held_reason}` : ""}
                  </p>
                  <p className="break-words whitespace-pre-wrap">{h.body}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          h.type === "post"
                            ? updatePost({ postId: h.id, action: "approve" })
                            : updateComment({ commentId: h.id, action: "approve" }),
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          h.type === "post"
                            ? updatePost({ postId: h.id, action: "remove" })
                            : updateComment({ commentId: h.id, action: "remove" }),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </GlassCard>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="reports-heading" className="flex flex-col gap-3">
        <h2 id="reports-heading" className="type-h3">
          Reports <span className="text-ink-muted">({reports.length})</span>
        </h2>
        {reports.length === 0 ? (
          <p className="text-ink-muted">No open reports.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((r) => (
              <li key={r.id}>
                <GlassCard className="flex flex-col gap-2 p-4">
                  <p className="font-semibold">
                    {REPORT_REASONS[r.reason as keyof typeof REPORT_REASONS] ?? r.reason}
                  </p>
                  <p className="type-body-sm text-ink-muted">
                    {r.reporter} reported {r.reported}
                    {r.post_id ? "'s post" : r.comment_id ? "'s comment" : ""} · {timeAgo(r.created_at, now)}
                  </p>
                  {r.content ? (
                    <blockquote className="border-l-2 border-line pl-3 break-words whitespace-pre-wrap text-ink-muted">
                      {r.content}
                    </blockquote>
                  ) : null}
                  {r.details ? <p className="type-body-sm">“{r.details}”</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {r.post_id || r.comment_id ? (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(() => resolveGroupReport({ reportId: r.id, action: "remove_content" }))
                        }
                      >
                        Remove {r.post_id ? "post" : "comment"}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm(`Ban ${r.reported} from the group?`))
                          run(() => resolveGroupReport({ reportId: r.id, action: "ban" }));
                      }}
                    >
                      Ban {r.reported}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => run(() => resolveGroupReport({ reportId: r.id, action: "dismiss" }))}
                    >
                      Dismiss
                    </Button>
                  </div>
                </GlassCard>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
