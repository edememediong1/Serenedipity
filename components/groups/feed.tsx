"use client";

import { useState } from "react";
import type { FeedPost } from "@/lib/groups/data";
import { PostCard } from "./post-card";
import { ReportDialog, type ReportTarget } from "./report-dialog";

/** The list of posts plus the shared report dialog. */
export function Feed({
  posts,
  groupId,
  viewer,
  now,
}: {
  posts: FeedPost[];
  groupId: string;
  viewer: { userId: string; isMod: boolean; canPost: boolean };
  now: number;
}) {
  const [report, setReport] = useState<ReportTarget | null>(null);
  return (
    <>
      {posts.length === 0 ? (
        <p className="text-ink-muted">
          No posts yet. Say hello, share what you&apos;re working on, or ask a question.
        </p>
      ) : (
        <ul className="flex flex-col gap-4" aria-label="Posts">
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard post={p} viewer={viewer} groupId={groupId} now={now} onReport={setReport} />
            </li>
          ))}
        </ul>
      )}
      <ReportDialog target={report} onClose={() => setReport(null)} />
    </>
  );
}
