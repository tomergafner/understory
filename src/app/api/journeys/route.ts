import { hasDb } from "@/lib/server/db";
import { getOrCreateUserId } from "@/lib/server/identity";
import { ensureUser, listJourneys } from "@/lib/server/journeys";

export async function GET() {
  if (!hasDb()) {
    return Response.json({ error: "no_db" }, { status: 503 });
  }
  try {
    const userId = await getOrCreateUserId();
    await ensureUser(userId);
    const journeys = await listJourneys(userId);
    return Response.json({ journeys });
  } catch (err) {
    console.error("journeys list failed", err);
    return Response.json({ error: "db_error" }, { status: 503 });
  }
}
