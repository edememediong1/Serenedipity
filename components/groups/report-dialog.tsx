"use client";

import { useState, useTransition } from "react";
import { reportGroupContent } from "@/app/app/groups/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipGroup } from "@/components/ui/chip";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { REPORT_REASONS } from "@/lib/rooms/validation";

type Reason = keyof typeof REPORT_REASONS;
export type ReportTarget = {
  groupId: string;
  userId: string;
  name: string;
  postId?: string;
  commentId?: string;
};

/** Report a post, comment or member to the group's moderators (and the Serenedipity team). */
export function ReportDialog({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const what = target?.commentId ? "comment" : target?.postId ? "post" : "member";

  function close() {
    setReason(null);
    setDetails("");
    setBlock(false);
    setResult(null);
    onClose();
  }

  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetTitle>Report this {what}</SheetTitle>
        {result?.ok ? (
          <>
            <SheetDescription>{result.text}</SheetDescription>
            <Button variant="secondary" onClick={close}>
              Done
            </Button>
          </>
        ) : (
          <>
            <SheetDescription>
              Reports are private: {target?.name} isn&apos;t told who reported them.
            </SheetDescription>
            <fieldset className="flex flex-col gap-2">
              <legend className="pb-2 type-body-sm font-semibold">What&apos;s wrong?</legend>
              <ChipGroup
                type="single"
                aria-label="What's wrong?"
                value={reason}
                onValueChange={setReason}
                options={Object.entries(REPORT_REASONS).map(([value, label]) => ({
                  value: value as Reason,
                  label,
                }))}
              />
            </fieldset>
            <div className="flex flex-col gap-2">
              <label htmlFor="group-report-details" className="type-body-sm font-semibold">
                Anything else? <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <textarea
                id="group-report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                rows={3}
                className="rounded-sm border border-line bg-surface-glass px-4 py-3 text-ink focus-ring"
              />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="group-report-block"
                checked={block}
                onCheckedChange={(v) => setBlock(v === true)}
              />
              <label htmlFor="group-report-block">Also block {target?.name}</label>
            </div>
            {result && !result.ok ? (
              <p role="alert" className="type-body-sm text-orange">
                {result.text}
              </p>
            ) : null}
            <Button
              disabled={pending || !reason}
              onClick={() =>
                target &&
                reason &&
                start(async () => {
                  const res = await reportGroupContent({
                    groupId: target.groupId,
                    userId: target.userId,
                    postId: target.postId,
                    commentId: target.commentId,
                    reason,
                    details,
                    block,
                  });
                  setResult({ ok: res.ok, text: res.ok ? (res.message ?? "Thanks.") : res.message });
                })
              }
            >
              {pending ? "Sending…" : "Send report"}
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
