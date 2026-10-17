import "server-only";
import type { Profile } from "@/lib/auth/session";
import { getAppSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDateKey, startOfLocalDay } from "@/lib/time";
import { remaining, roomLimits, type RoomLimits } from "./access";

export type RoomAllowance = {
  limits: RoomLimits;
  /** The person's local date, used for room_joins.joined_on. */
  today: string;
  joinedRoomIds: Set<string>;
  joinedToday: number;
  createdToday: number;
  joinsLeft: number | null;
  createsLeft: number | null;
};

/** Today's room allowance and usage for one person, in their time zone. */
export async function roomAllowance(
  userId: string,
  profile: Pick<Profile, "plan" | "timezone">,
  admin: boolean,
): Promise<RoomAllowance> {
  const db = createAdminClient();
  const now = Date.now();
  const today = localDateKey(now, profile.timezone);
  const since = startOfLocalDay(now, profile.timezone).toISOString();
  const [settings, { data: joins }, { count: created }] = await Promise.all([
    getAppSettings(db),
    db.from("room_joins").select("room_id").eq("user_id", userId).eq("joined_on", today),
    db
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("host_id", userId)
      .gte("created_at", since),
  ]);
  const limits = roomLimits(
    { createsPerDay: settings.freeDailyRoomCreates, joinsPerDay: settings.freeDailyRoomJoins },
    profile.plan,
    admin,
  );
  const joinedRoomIds = new Set((joins ?? []).map((j) => j.room_id));
  const createdToday = created ?? 0;
  return {
    limits,
    today,
    joinedRoomIds,
    joinedToday: joinedRoomIds.size,
    createdToday,
    joinsLeft: remaining(limits.joinsPerDay, joinedRoomIds.size),
    createsLeft: remaining(limits.createsPerDay, createdToday),
  };
}
