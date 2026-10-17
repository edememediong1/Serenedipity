"use client";

import { useState, useTransition } from "react";
import { updateStreakRestDays } from "@/app/app/settings/actions";
import { ChipGroup } from "@/components/ui/chip";

const OPTIONS = [
  { value: "2", label: "Gentle", description: "2 rest days a week" },
  { value: "1", label: "Steady", description: "1 rest day a week" },
  { value: "0", label: "Strict", description: "Every day counts" },
] as const;

/** How forgiving streaks are. Saves on change. */
export function StreakSettings({ restDays }: { restDays: number }) {
  const [value, setValue] = useState(String(restDays));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <p id="streak-mode-help" className="type-body-sm text-ink-muted">
        Rest days are missed days that don&apos;t break your streak.
      </p>
      <ChipGroup
        type="single"
        aria-label="Streak mode"
        aria-describedby="streak-mode-help"
        value={value}
        disabled={pending}
        onValueChange={(v) => {
          setValue(v);
          start(async () => setMessage((await updateStreakRestDays(Number(v))).message));
        }}
        options={OPTIONS.map((o) => ({ value: o.value, label: o.label, description: o.description }))}
      />
      <p role="status" className="min-h-5 type-body-sm text-ink-muted">
        {message}
      </p>
    </div>
  );
}
