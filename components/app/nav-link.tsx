"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { isActive, PRIMARY_NAV, REVIEW_NAV, GAMES_NAV, SETTINGS_NAV, type NavItem } from "./nav-items";

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-md px-3 type-body-sm focus-ring transition-colors duration-300",
        active ? "bg-white/[0.08] text-ink" : "text-ink-muted hover:bg-white/[0.04] hover:text-ink",
      )}
    >
      <Icon className="size-5 stroke-[1.5]" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

/**
 * The active item depends on the URL, which isn't known while a dynamic route prerenders, so each
 * nav renders without a highlight first and streams the highlighted version in.
 */
function withPathname(View: (p: { pathname: string }) => React.ReactNode) {
  function Live() {
    return <View pathname={usePathname()} />;
  }
  return function Nav() {
    return (
      <Suspense fallback={<View pathname="" />}>
        <Live />
      </Suspense>
    );
  };
}

/** Desktop sidebar navigation: primary items, a divider, then Settings. */
function SidebarNavView({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="App" className="flex flex-1 flex-col gap-1">
      {PRIMARY_NAV.map((item) => (
        <SidebarLink key={item.href} item={item} pathname={pathname} />
      ))}
      <SidebarLink item={REVIEW_NAV} pathname={pathname} />
      <SidebarLink item={GAMES_NAV} pathname={pathname} />
      <hr className="my-3 border-line" />
      <SidebarLink item={SETTINGS_NAV} pathname={pathname} />
    </nav>
  );
}

/** Mobile bottom tab bar. */
function TabBarView({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="App"
      className="flex border-t border-line bg-surface/85 px-2 pb-[max(env(safe-area-inset-bottom),8px)] backdrop-blur-xl"
    >
      {PRIMARY_NAV.map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium focus-ring transition-colors duration-300",
              active ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon className="size-6 stroke-[1.5]" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const SidebarNav = withPathname(SidebarNavView);
export const TabBar = withPathname(TabBarView);
