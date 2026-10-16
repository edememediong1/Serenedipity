"use client";

import { useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import { createPost } from "@/app/app/groups/actions";
import { SupportResources } from "@/components/luna/support-resources";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { inputClassName } from "@/components/ui/input";
import { POST_KINDS, type PostKind } from "@/lib/groups/rules";

const PLACEHOLDER: Record<PostKind, string> = {
  update: "What are you working on today?",
  question: "What do you need help with?",
  resource: "Share something useful: notes, a video, a method…",
  win: "What went well? Your streak and today's focus time are added for you.",
};

/** New post: kind, text and an optional link. */
export function Composer({ groupId }: { groupId: string }) {
  const [kind, setKind] = useState<PostKind>("update");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; support?: boolean } | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    start(async () => {
      const res = await createPost({ groupId, kind, body, linkUrl: showLink ? link : "" });
      if (res.ok) {
        setBody("");
        setLink("");
        setShowLink(false);
        setResult({ ok: true, text: res.message, support: res.support });
      } else setResult({ ok: false, text: res.message });
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg p-4 glass md:p-5" aria-label="New post">
      <ChipGroup
        type="single"
        aria-label="Post type"
        value={kind}
        onValueChange={setKind}
        options={(Object.keys(POST_KINDS) as PostKind[]).map((k) => ({ value: k, label: POST_KINDS[k] }))}
      />
      <label htmlFor="post-body" className="sr-only">
        Write a post
      </label>
      <textarea
        id="post-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder={PLACEHOLDER[kind]}
        className={inputClassName + " py-3"}
      />
      {showLink ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="post-link" className="type-body-sm">
            Link
          </label>
          <input
            id="post-link"
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://"
            className={inputClassName}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowLink((s) => !s)}
          aria-expanded={showLink}
        >
          <Link2 aria-hidden="true" /> {showLink ? "Remove link" : "Add a link"}
        </Button>
        <div className="flex items-center gap-3">
          <span className="type-body-sm text-ink-muted tabular-nums" aria-hidden="true">
            {body.length}/2000
          </span>
          <Button type="submit" disabled={pending || !body.trim()}>
            {pending ? "Posting…" : "Post"}
          </Button>
        </div>
      </div>
      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={result.ok ? "type-body-sm text-blue-soft" : "type-body-sm text-orange"}
        >
          {result.text}
        </p>
      ) : null}
      {result?.support ? (
        <div className="flex flex-col gap-3">
          <p>
            It sounds like you might be going through something heavy. You don&apos;t have to carry it alone,
            and the people below are there right now.
          </p>
          <SupportResources headingLevel={3} />
        </div>
      ) : null}
    </form>
  );
}
