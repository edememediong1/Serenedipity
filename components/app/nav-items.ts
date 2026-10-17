import {
  BarChart3,
  UsersRound,
  Clock,
  Gamepad2,
  Headphones,
  MessageCircle,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra paths that should highlight this item. */
  match?: string[];
};

/** Listen is the app's home (the Home screen in the design shows the Listen tab active). */
export const PRIMARY_NAV: readonly NavItem[] = [
  { href: "/app", label: "Listen", icon: Headphones, match: ["/app/listen"] },
  { href: "/app/check-in", label: "Check in", icon: MessageCircle },
  { href: "/app/focus", label: "Focus", icon: Clock },
  { href: "/app/rooms", label: "Rooms", icon: Users },
];

/** In the desktop sidebar; on mobile it lives in the account menu and on the home page. */
export const REVIEW_NAV: NavItem = { href: "/app/review", label: "Review", icon: BarChart3 };

/** Calm games for breaks. Sidebar on desktop; account menu and break screens on mobile. */
export const GAMES_NAV: NavItem = { href: "/app/games", label: "Games", icon: Gamepad2 };

/** Study groups. Sidebar on desktop; account menu and the Rooms page on mobile. */
export const GROUPS_NAV: NavItem = { href: "/app/groups", label: "Groups", icon: UsersRound };

export const SETTINGS_NAV: NavItem = { href: "/app/settings", label: "Settings", icon: Settings };

export function isActive(item: NavItem, pathname: string) {
  if (item.href === "/app")
    return pathname === "/app" || (item.match ?? []).some((m) => pathname.startsWith(m));
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
