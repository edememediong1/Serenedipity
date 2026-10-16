"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, BarChart3, Flag, ListOrdered, Music, Settings, Users, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/waitlist", label: "Waitlist", icon: ListOrdered },
  { href: "/admin/settings", label: "Limits & settings", icon: Settings },
];
const SOON = [
  { label: "Music library", icon: Music },
  { label: "Focus rooms", icon: UsersRound },
  { label: "Safety reports", icon: Flag },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 type-body-sm focus-ring transition-colors",
              active ? "bg-white/[0.08] text-ink" : "text-ink-muted hover:bg-white/[0.04] hover:text-ink",
            )}
          >
            <Icon className="size-5 stroke-[1.5]" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
      <hr className="my-3 border-line" />
      <p className="px-3 pb-1 type-eyebrow text-ink-muted">Coming with later phases</p>
      {SOON.map((item) => {
        const Icon = item.icon;
        return (
          <span
            key={item.label}
            className="flex min-h-11 items-center gap-3 px-3 type-body-sm text-ink-muted/70"
          >
            <Icon className="size-5 stroke-[1.5]" aria-hidden="true" />
            {item.label}
          </span>
        );
      })}
      <hr className="my-3 border-line" />
      <Link
        href="/app"
        className="flex min-h-11 items-center gap-3 rounded-md px-3 type-body-sm text-ink-muted focus-ring hover:text-ink"
      >
        <ArrowLeft className="size-5 stroke-[1.5]" aria-hidden="true" /> Back to the app
      </Link>
    </nav>
  );
}
