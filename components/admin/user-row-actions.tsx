"use client";

import { useState, useTransition } from "react";
import { updateUser } from "@/app/admin/actions";

/** Plan and role selects for one user. Changes save immediately. */
export function UserRowActions({
  userId,
  plan,
  role,
  email,
}: {
  userId: string;
  plan: string;
  role: string;
  email: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const save = (patch: { plan?: "free" | "premium"; role?: "user" | "admin" }) =>
    startTransition(async () => setMessage((await updateUser({ userId, ...patch })).message));
  const who = email ?? "this user";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`plan-${userId}`}>
        Plan for {who}
      </label>
      <select
        id={`plan-${userId}`}
        defaultValue={plan}
        disabled={pending}
        onChange={(e) => save({ plan: e.target.value as "free" | "premium" })}
        className="min-h-11 rounded-sm border border-line bg-surface-deep px-2 text-ink focus-ring"
      >
        <option value="free">Free</option>
        <option value="premium">Pro</option>
      </select>
      <label className="sr-only" htmlFor={`role-${userId}`}>
        Role for {who}
      </label>
      <select
        id={`role-${userId}`}
        defaultValue={role}
        disabled={pending}
        onChange={(e) => save({ role: e.target.value as "user" | "admin" })}
        className="min-h-11 rounded-sm border border-line bg-surface-deep px-2 text-ink focus-ring"
      >
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <span aria-live="polite" className="type-body-sm text-ink-muted">
        {message}
      </span>
    </div>
  );
}
