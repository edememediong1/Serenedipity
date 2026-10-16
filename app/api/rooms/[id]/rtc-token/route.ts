import { NextResponse, type NextRequest } from "next/server";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { agoraUid } from "@/lib/rooms/access";
import { mediaConfigured } from "@/lib/rooms/media";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Tokens are short-lived; the client renews them, and renewal is refused once someone is removed. */
const TOKEN_TTL_SECONDS = 10 * 60;

/** Issues an Agora token for a room's voice/video channel to an active, non-removed participant. */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/rooms/[id]/rtc-token">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Unknown room." }, { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (!mediaConfigured())
    return NextResponse.json({ error: "Voice and video aren't set up yet." }, { status: 501 });

  const { data: me } = await createAdminClient()
    .from("room_participants")
    .select("removed, left_at, room:rooms(status)")
    .eq("room_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const room = Array.isArray(me?.room) ? me.room[0] : me?.room;
  if (!me || me.removed || me.left_at || room?.status !== "active")
    return NextResponse.json({ error: "You're not in this room." }, { status: 403 });

  const uid = agoraUid(userId);
  const channel = `room-${id}`;
  const token = RtcTokenBuilder.buildTokenWithUid(
    process.env.AGORA_APP_ID!,
    process.env.AGORA_APP_CERTIFICATE!,
    channel,
    uid,
    RtcRole.PUBLISHER,
    TOKEN_TTL_SECONDS,
    TOKEN_TTL_SECONDS,
  );
  return NextResponse.json(
    { appId: process.env.AGORA_APP_ID, channel, uid, token },
    { headers: { "Cache-Control": "no-store" } },
  );
}
