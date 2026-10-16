"use client";

import { Check, CornerDownRight, X } from "lucide-react";
import { useState, useTransition } from "react";
import { resolveTask } from "@/app/app/review/actions";
import { Button } from "@/components/ui/button";

const DONE_TEXT = {
  done: "Marked as done. Nice.",
  carry: "Added to today's plan.",
  drop: "Let go. That's allowed.",
} as const;

/** "Did you finish this?" answers for one task. */
export function ResolveButtons({ taskId, title }: { taskId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const [answer, setAnswer] = useState<keyof typeof DONE_TEXT | null>(null);
  const act = (a: keyof typeof DONE_TEXT) =>
    startTransition(async () => {
      const res = await resolveTask(taskId, a);
      if (res.ok) setAnswer(a);
    });

  if (answer) {
    return (
      <p className="type-body-sm text-ink-muted" role="status">
        {DONE_TEXT[answer]}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={`Did you finish "${title}"?`}>
      <Button size="sm" disabled={pending} onClick={() => act("done")}>
        <Check aria-hidden="true" /> Yes, done
      </Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => act("carry")}>
        <CornerDownRight aria-hidden="true" /> Carry to today
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("drop")}>
        <X aria-hidden="true" /> Let it go
      </Button>
    </div>
  );
}
