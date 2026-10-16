"use client";

import Link from "next/link";
import { BarChart3, LayoutDashboard, LogOut, Settings, User } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MenuUser = { name: string | null; email: string | null };

export function initialsFor(user: MenuUser) {
  const source = user.name?.trim() || user.email?.split("@")[0] || "";
  return source.slice(0, 1).toUpperCase() || "·";
}

export function Avatar({ user, size = 40 }: { user: MenuUser; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-pill font-semibold text-on-brand [background:var(--gradient-primary)]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initialsFor(user)}
    </span>
  );
}

/** Avatar button with Profile, Settings and Sign out. */
export function UserMenu({ user, isAdmin = false }: { user: MenuUser; isAdmin?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-11 items-center justify-center rounded-pill focus-ring"
        aria-label="Account menu"
      >
        <Avatar user={user} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block type-h3">{user.name || "Your account"}</span>
          {user.email ? (
            <span className="block truncate type-body-sm text-ink-muted">{user.email}</span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings#profile">
            <User aria-hidden="true" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/review">
            <BarChart3 aria-hidden="true" /> Review
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/settings">
            <Settings aria-hidden="true" /> Settings
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboard aria-hidden="true" /> Admin dashboard
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void signOut();
          }}
        >
          <LogOut aria-hidden="true" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Placeholder with the avatar's footprint while the session streams in. */
export function UserMenuFallback() {
  return <span aria-hidden="true" className="block size-10 rounded-pill bg-surface-deep" />;
}
