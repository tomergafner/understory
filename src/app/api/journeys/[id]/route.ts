import { hasDb } from "@/lib/server/db";
import { getOrCreateUserId } from "@/lib/server/identity";
import { deleteJourney, ensureUser, upsertJourney } from "@/lib/server/journeys";
import type { LearningJourney } from "@/lib/types";

function isJourneyShaped(value: unknown): value is LearningJourney {
  if (typeof value !== "object" || value === null) return false;
  const j = value as Record<string, unknown>;
  return (
    typeof j.id === "string" &&
    typeof j.repoId === "string" &&
    typeof j.createdAt === "number" &&
    typeof j.lastActiveAt === "number" &&
    Array.isArray(j.steps) &&
    Array.isArray(j.reviews) &&
    typeof j.learner === "object" &&
    j.learner !== null
  );
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasDb()) return Response.json({ error: "no_db" }, { status: 503 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!isJourneyShaped(body) || body.id !== id) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  try {
    const userId = await getOrCreateUserId();
    await ensureUser(userId);
    await upsertJourney(userId, body);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("journey upsert failed", err);
    return Response.json({ error: "db_error" }, { status: 503 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasDb()) return Response.json({ error: "no_db" }, { status: 503 });
  const { id } = await params;
  try {
    const userId = await getOrCreateUserId();
    await deleteJourney(userId, id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("journey delete failed", err);
    return Response.json({ error: "db_error" }, { status: 503 });
  }
}
