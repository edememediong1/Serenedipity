"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, MessageSquare, MoreHorizontal, Pin } from "lucide-react";
import { createComment, toggleReaction, updateComment, updatePost } from "@/app/app/groups/actions";
import { Flame } from "@/components/streaks/flame";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FeedComment, FeedPost } from "@/lib/groups/data";
import { HELD_LABELS } from "@/lib/groups/moderation";
import { POST_KINDS, REACTIONS, type PostKind, type Reaction } from "@/lib/groups/rules";
import { initials } from "@/lib/rooms/access";
import { cn } from "@/lib/utils";
import type { ReportTarget } from "./report-dialog";
import { timeAgo } from "./time-ago";

type Viewer = { userId: string; isMod: boolean; canPost: boolean };

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-pill font-semibold text-on-brand bg-gradient-orb",
        size === "md" ? "size-10 text-sm" : "size-8 text-xs",
      )}
    >
      {initials(name)}
    </span>
  );
}

function CommentForm({
  postId,
  parentId,
  label,
  onDone,
}: {
  postId: string;
  parentId?: string;
  label: string;
  onDone?: () => void;
}) {
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const id = `comment-${postId}-${parentId ?? "top"}`;
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createComment({ postId, parentId: parentId ?? null, body });
          if (res.ok) {
            setBody("");
            setMsg(res.held ? { ok: true, text: res.message } : null);
            if (!res.held) onDone?.();
          } else setMsg({ ok: false, text: res.message });
        });
      }}
    >
      <div className="flex gap-2">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          id={id}
          value={body}
          maxLength={1000}
          onChange={(e) => setBody(e.target.value)}
          placeholder={label}
          className="min-h-11 min-w-0 flex-1 rounded-pill border border-line bg-surface-glass px-4 text-ink focus-ring placeholder:text-ink-muted"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={pending || !body.trim()}>
          {pending ? "…" : "Send"}
        </Button>
      </div>
      {msg ? (
        <p
          role={msg.ok ? "status" : "alert"}
          className={cn("type-body-sm", msg.ok ? "text-blue-soft" : "text-orange")}
        >
          {msg.text}
        </p>
      ) : null}
    </form>
  );
}

function CommentItem({
  c,
  replies,
  postId,
  viewer,
  now,
  onReport,
  groupId,
}: {
  c: FeedComment;
  replies: FeedComment[];
  postId: string;
  viewer: Viewer;
  now: number;
  onReport: (t: ReportTarget) => void;
  groupId: string;
}) {
  const [replying, setReplying] = useState(false);
  const [, start] = useTransition();
  const mine = c.author_id === viewer.userId;
  const actions = (x: FeedComment) => (
    <span className="flex gap-3 type-body-sm text-ink-muted">
      {x.author_id !== viewer.userId ? (
        <button
          type="button"
          className="min-h-8 rounded-sm focus-ring hover:text-ink"
          onClick={() => onReport({ groupId, userId: x.author_id, name: x.author, postId, commentId: x.id })}
        >
          Report
        </button>
      ) : null}
      {x.author_id === viewer.userId || viewer.isMod ? (
        <button
          type="button"
          className="min-h-8 rounded-sm focus-ring hover:text-ink"
          onClick={() => start(async () => void (await updateComment({ commentId: x.id, action: "remove" })))}
        >
          Delete
        </button>
      ) : null}
      {x.status === "held" && viewer.isMod ? (
        <button
          type="button"
          className="min-h-8 rounded-sm text-blue-soft focus-ring"
          onClick={() =>
            start(async () => void (await updateComment({ commentId: x.id, action: "approve" })))
          }
        >
          Approve
        </button>
      ) : null}
    </span>
  );
  const body = (x: FeedComment) => (
    <div className="min-w-0 flex-1">
      <p className="type-body-sm">
        <span className="font-semibold">{x.author_id === viewer.userId ? "You" : x.author}</span>{" "}
        <span className="text-ink-muted">· {timeAgo(x.created_at, now)}</span>
        {x.status === "held" ? <span className="text-orange"> · Waiting for review</span> : null}
      </p>
      <p className="break-words whitespace-pre-wrap">{x.body}</p>
      {actions(x)}
    </div>
  );
  return (
    <li className="flex flex-col gap-2">
      <div className="flex gap-2.5">
        <Avatar name={c.author} size="sm" />
        {body(c)}
      </div>
      <div className="flex flex-col gap-2 pl-10">
        {replies.length ? (
          <ul className="flex flex-col gap-2">
            {replies.map((r) => (
              <li key={r.id} className="flex gap-2.5">
                <Avatar name={r.author} size="sm" />
                {body(r)}
              </li>
            ))}
          </ul>
        ) : null}
        {viewer.canPost ? (
          replying ? (
            <CommentForm
              postId={postId}
              parentId={c.id}
              label={`Reply to ${mine ? "yourself" : c.author}`}
              onDone={() => setReplying(false)}
            />
          ) : (
            <button
              type="button"
              className="min-h-8 w-fit rounded-sm type-body-sm text-ink-muted focus-ring hover:text-ink"
              onClick={() => setReplying(true)}
            >
              Reply
            </button>
          )
        ) : null}
      </div>
    </li>
  );
}

/** One post: author, body, link, win snapshot, reactions, comments (one level of replies) and actions. */
export function PostCard({
  post,
  viewer,
  groupId,
  now,
  onReport,
}: {
  post: FeedPost;
  viewer: Viewer;
  groupId: string;
  now: number;
  onReport: (t: ReportTarget) => void;
}) {
  const [open, setOpen] = useState(post.comments.length > 0 && post.comments.length <= 3);
  const [pending, start] = useTransition();
  const mine = post.author_id === viewer.userId;
  const top = post.comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => post.comments.filter((c) => c.parent_id === id);
  const act = (action: Parameters<typeof updatePost>[0]["action"]) =>
    start(async () => void (await updatePost({ postId: post.id, action })));
  const visibleComments = post.comments.filter((c) => c.status === "visible").length;

  return (
    <article
      className={cn("flex flex-col gap-3 rounded-lg p-4 glass md:p-5", post.pinned && "border-blue-soft/40")}
      aria-labelledby={`post-${post.id}-author`}
    >
      <header className="flex items-start gap-3">
        <Avatar name={post.author} />
        <div className="min-w-0 flex-1">
          <p id={`post-${post.id}-author`} className="font-semibold">
            {mine ? "You" : post.author}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 type-body-sm text-ink-muted">
            <span>{POST_KINDS[post.kind as PostKind] ?? post.kind}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.created_at}>{timeAgo(post.created_at, now)}</time>
            {post.pinned ? (
              <span className="inline-flex items-center gap-1 text-blue-soft">
                <Pin className="size-3.5 stroke-[1.5]" aria-hidden="true" /> Pinned
              </span>
            ) : null}
            {post.kind === "question" && post.solved ? (
              <span className="inline-flex items-center gap-1 text-blue-soft">
                <CheckCircle2 className="size-3.5 stroke-[1.5]" aria-hidden="true" /> Solved
              </span>
            ) : null}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-muted focus-ring hover:bg-white/[0.06] hover:text-ink"
            aria-label={`Post options for ${mine ? "your post" : `${post.author}'s post`}`}
            disabled={pending}
          >
            <MoreHorizontal className="size-5 stroke-[1.5]" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {post.kind === "question" && (mine || viewer.isMod) ? (
              <DropdownMenuItem onSelect={() => act(post.solved ? "unsolve" : "solve")}>
                {post.solved ? "Mark as unsolved" : "Mark as solved"}
              </DropdownMenuItem>
            ) : null}
            {viewer.isMod ? (
              <DropdownMenuItem onSelect={() => act(post.pinned ? "unpin" : "pin")}>
                {post.pinned ? "Unpin" : "Pin to top"}
              </DropdownMenuItem>
            ) : null}
            {post.status === "held" && viewer.isMod ? (
              <DropdownMenuItem onSelect={() => act("approve")}>Approve post</DropdownMenuItem>
            ) : null}
            {!mine ? (
              <DropdownMenuItem
                onSelect={() =>
                  onReport({ groupId, userId: post.author_id, name: post.author, postId: post.id })
                }
              >
                Report post
              </DropdownMenuItem>
            ) : null}
            {mine || viewer.isMod ? (
              <DropdownMenuItem onSelect={() => act("remove")}>Delete post</DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {post.status === "held" ? (
        <p className="rounded-sm border border-orange/40 px-3 py-2 type-body-sm text-orange">
          Waiting for a moderator
          {post.held_reason && viewer.isMod ? ` · ${HELD_LABELS[post.held_reason] ?? post.held_reason}` : ""}.
          Only
          {viewer.isMod ? " moderators and the author" : " you"} can see it.
        </p>
      ) : null}

      <p className="break-words whitespace-pre-wrap">{post.body}</p>

      {post.link_url ? (
        <a
          href={post.link_url}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="inline-flex min-h-11 w-fit max-w-full items-center gap-2 rounded-sm type-body-sm text-blue-soft focus-ring hover:underline"
        >
          <ExternalLink className="size-4 shrink-0 stroke-[1.5]" aria-hidden="true" />
          <span className="truncate">{post.link_url.replace(/^https?:\/\//, "")}</span>
        </a>
      ) : null}

      {post.kind === "win" && post.win ? (
        <div className="flex items-center gap-3 rounded-md bg-white/[0.05] p-3">
          <Flame size={32} lit={post.win.streak > 0} />
          <p className="type-body-sm">
            <span className="font-semibold">{post.win.streak}-day streak</span>
            <span className="text-ink-muted">
              {" "}
              · {post.win.minutesToday} min focused today
              {post.win.blocksToday
                ? ` · ${post.win.blocksToday} ${post.win.blocksToday === 1 ? "block" : "blocks"}`
                : ""}
            </span>
          </p>
        </div>
      ) : null}

      {post.status === "visible" ? (
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(REACTIONS) as Reaction[]).map((r) => {
            const rx = post.reactions[r];
            return (
              <button
                key={r}
                type="button"
                disabled={!viewer.canPost}
                aria-pressed={!!rx?.mine}
                aria-label={`React ${r}${rx ? `, ${rx.count}` : ""}`}
                onClick={() =>
                  start(async () => void (await toggleReaction({ postId: post.id, reaction: r })))
                }
                className={cn(
                  "inline-flex min-h-9 min-w-11 items-center justify-center gap-1 rounded-pill border px-3 text-sm focus-ring transition-colors",
                  rx?.mine ? "border-blue-soft/60 bg-blue-soft/15" : "border-line hover:bg-white/[0.06]",
                )}
              >
                <span aria-hidden="true">{REACTIONS[r]}</span>
                {rx ? <span className="tabular-nums">{rx.count}</span> : null}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-sm type-body-sm text-ink-muted focus-ring hover:text-ink"
          >
            <MessageSquare className="size-4 stroke-[1.5]" aria-hidden="true" />
            {visibleComments
              ? `${visibleComments} ${visibleComments === 1 ? "comment" : "comments"}`
              : "Comment"}
          </button>
        </div>
      ) : null}

      {open && post.status === "visible" ? (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          {top.length ? (
            <ul className="flex flex-col gap-3" aria-label="Comments">
              {top.map((c) => (
                <CommentItem
                  key={c.id}
                  c={c}
                  replies={repliesOf(c.id)}
                  postId={post.id}
                  viewer={viewer}
                  now={now}
                  onReport={onReport}
                  groupId={groupId}
                />
              ))}
            </ul>
          ) : null}
          {viewer.canPost ? <CommentForm postId={post.id} label="Write a comment" /> : null}
        </div>
      ) : null}
    </article>
  );
}
