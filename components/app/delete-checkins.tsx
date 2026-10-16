"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteCheckInHistory, type SettingsResult } from "@/app/app/settings/actions";
import { Button } from "@/components/ui/button";
import { GUIDE_NAME } from "@/lib/config";

/** Two-step delete so a stray tap can't wipe history. */
export function DeleteCheckins() {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<SettingsResult | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <p className="type-body-sm text-ink-muted">
        What you tell {GUIDE_NAME} is kept only for your plans and history, and never used for ads or sold.
      </p>
      {confirming ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            className="border-critical/60 text-critical"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setResult(await deleteCheckInHistory());
                setConfirming(false);
              })
            }
          >
            {pending ? "Deleting…" : "Yes, delete everything"}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="secondary" block onClick={() => setConfirming(true)}>
          <Trash2 aria-hidden="true" /> Delete check-in history
        </Button>
      )}
      <p
        aria-live="polite"
        className={result?.ok === false ? "type-body-sm text-critical" : "type-body-sm text-ink"}
      >
        {result?.message}
      </p>
    </div>
  );
}
