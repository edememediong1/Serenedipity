import { Search } from "lucide-react";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { MiniPlayer } from "@/components/app/mini-player";
import { SidebarNav, TabBar } from "@/components/app/nav-link";
import { PlayerProvider } from "@/components/app/player-context";
import { GreetingSlot, PlanBadgeSlot, UserMenuSlot } from "@/components/app/session-slots";
import { UserMenuFallback } from "@/components/app/user-menu";

/**
 * Logged-in app shell.
 * - Desktop (lg+): left sidebar, top bar with greeting, search and account menu, player docked at the bottom.
 * - Mobile: top bar with logo and avatar, mini player above a bottom tab bar.
 * Session-dependent pieces stream in behind their own <Suspense> boundaries so the shell renders instantly.
 */
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <PlayerProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface-deep px-4 py-3 focus-ring focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-line bg-surface/40 px-4 py-6 backdrop-blur-xl lg:flex">
        <div className="px-2">
          <Logo href="/app" />
        </div>
        <SidebarNav />
        <Suspense fallback={<div className="h-28 rounded-md bg-surface-deep/60" aria-hidden="true" />}>
          <PlanBadgeSlot />
        </Suspense>
      </aside>

      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-surface/60 px-6 backdrop-blur-xl lg:hidden">
          <Logo href="/app" size="sm" />
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenuSlot />
          </Suspense>
        </header>

        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          {/* Desktop top bar */}
          <header className="hidden h-20 items-center justify-between gap-6 lg:flex">
            <Suspense fallback={<span className="h-5 w-48 rounded-sm bg-surface-deep" aria-hidden="true" />}>
              <GreetingSlot />
            </Suspense>
            <div className="flex items-center gap-3">
              {/* TODO(search): wire to the music library once it exists. UI only for now. */}
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 stroke-[1.5] text-ink-muted"
                  aria-hidden="true"
                />
                <label htmlFor="app-search" className="sr-only">
                  Search music, moods and styles
                </label>
                <input
                  id="app-search"
                  type="search"
                  placeholder="Search music, moods, styles"
                  className="h-11 w-72 rounded-pill border border-line bg-surface-glass pr-4 pl-11 type-body-sm text-ink focus-ring placeholder:text-ink-muted"
                />
              </div>
              <Suspense fallback={<UserMenuFallback />}>
                <UserMenuSlot />
              </Suspense>
            </div>
          </header>

          <main id="main" className="pt-4 pb-56 lg:pt-2 lg:pb-36">
            {children}
          </main>
        </div>

        {/* Desktop: player docked at the bottom of the content area */}
        <div className="pointer-events-none fixed right-0 bottom-0 left-64 z-20 hidden px-10 pb-6 lg:block">
          <div className="pointer-events-auto mx-auto max-w-6xl">
            <MiniPlayer className="max-w-xl" />
          </div>
        </div>
      </div>

      {/* Mobile: mini player above the tab bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        <div className="px-3 pb-2">
          <MiniPlayer />
        </div>
        <TabBar />
      </div>
    </PlayerProvider>
  );
}
