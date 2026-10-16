"use client";

import { useState, useTransition } from "react";
import type { AdminResult } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/** A button that runs an admin server action and reports the result inline. */
export function AdminActionButton({
  run,
  label,
  confirm,
  variant = "secondary",
}: {
  run: () => Promise<AdminResult>;
  label: string;
  confirm?: string;
  variant?: "secondary" | "ghost" | "primary";
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        variant={variant}
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => setMessage((await run()).message));
        }}
      >
        {pending ? "Working…" : label}
      </Button>
      {message ? (
        <span role="status" className="type-body-sm text-ink-muted">
          {message}
        </span>
      ) : null}
    </span>
  );
}
