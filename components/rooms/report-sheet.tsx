"use client";

import { useState, useTransition } from "react";
import { reportParticipant } from "@/app/app/rooms/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipGroup } from "@/components/ui/chip";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { REPORT_REASONS } from "@/lib/rooms/validation";

type Reason = keyof typeof REPORT_REASONS;
export type Reportable = { id: string; name: string };

/** Report someone in the room. Reports go to the team; blocking (on by default) takes effect at once. */
export function ReportSheet({
  open,
  onOpenChange,
  roomId,
  people,
  initialUserId,
  onBlocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  people: Reportable[];
  initialUserId: string | null;
  onBlocked: (userId: string) => void;
}) {
  const [userId, setUserId] = useState<string | null>(initialUserId);
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const [lastInitial, setLastInitial] = useState(initialUserId);

  // Reset when opened for a different person.
  if (initialUserId !== lastInitial) {
    setLastInitial(initialUserId);
    setUserId(initialUserId);
    setSent(false);
    setMessage(null);
  }

  function submit() {
    if (!userId || !reason) {
      setMessage("Choose who and why.");
      return;
    }
    start(async () => {
      const res = await reportParticipant({ roomId, userId, reason, details, block });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      if (block) onBlocked(userId);
      setSent(true);
      setReason(null);
      setDetails("");
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setSent(false);
          setMessage(null);
        }
      }}
    >
      <SheetContent side="right" className="overflow-y-auto">
        <SheetTitle>Report someone</SheetTitle>
        {sent ? (
          <>
            <SheetDescription>
              Thanks for telling us. The team will review it
              {block ? ", and you won't see or hear them again" : ""}.
            </SheetDescription>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Back to the room
            </Button>
          </>
        ) : (
          <>
            <SheetDescription>
              Reports are private. The person isn&apos;t told who reported them.
            </SheetDescription>
            {people.length === 0 ? (
              <p className="text-ink-muted">There&apos;s no one else in the room right now.</p>
            ) : (
              <div className="flex flex-col gap-5">
                <fieldset className="flex flex-col gap-2">
                  <legend className="pb-2 type-body-sm font-semibold">Who</legend>
                  <ChipGroup
                    type="single"
                    aria-label="Who"
                    value={userId}
                    onValueChange={setUserId}
                    options={people.map((p) => ({ value: p.id, label: p.name }))}
                  />
                </fieldset>
                <fieldset className="flex flex-col gap-2">
                  <legend className="pb-2 type-body-sm font-semibold">What happened</legend>
                  <ChipGroup
                    type="single"
                    aria-label="What happened"
                    value={reason}
                    onValueChange={setReason}
                    options={Object.entries(REPORT_REASONS).map(([value, label]) => ({
                      value: value as Reason,
                      label,
                    }))}
                  />
                </fieldset>
                <div className="flex flex-col gap-2">
                  <label htmlFor="report-details" className="type-body-sm font-semibold">
                    Anything else? <span className="font-normal text-ink-muted">(optional)</span>
                  </label>
                  <textarea
                    id="report-details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                    rows={3}
                    className="rounded-sm border border-line bg-surface-glass px-4 py-3 text-ink focus-ring"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="report-block" checked={block} onCheckedChange={(v) => setBlock(v === true)} />
                  <label htmlFor="report-block">Also block them</label>
                </div>
                {message ? (
                  <p role="alert" className="type-body-sm text-orange">
                    {message}
                  </p>
                ) : null}
                <Button onClick={submit} disabled={pending}>
                  {pending ? "Sending…" : "Send report"}
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
