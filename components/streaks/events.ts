import type { StreakEvent } from "@/lib/streaks/engine";

/** App-wide signal that today's first activity extended the streak (listened to by StreakCelebration). */
export const STREAK_EVENT = "serenedipity:streak-extended";

export function announceStreak(event: NonNullable<StreakEvent>) {
  window.dispatchEvent(new CustomEvent(STREAK_EVENT, { detail: event }));
}
