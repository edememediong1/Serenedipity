import { connection } from "next/server";

/** Server clock, so every room member derives the same timer and music position (within ~1s). */
export async function GET() {
  await connection();
  return Response.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
