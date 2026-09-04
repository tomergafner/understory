import { and, asc, desc, eq } from "drizzle-orm";
import type { LearningJourney } from "../types";
import { getDb } from "./db";
import {
  analyses as analysesTable,
  journeys,
  reviews,
  steps,
  users,
} from "./db/schema";
import { assembleJourney, journeyToRow } from "./journey-mapping";

// Journey persistence. Steps and reviews are append-only evidence — inserts
// use onConflictDoNothing keyed by (user, journey, seq), so re-sending a full
// journey is idempotent.

export async function ensureUser(userId: string): Promise<void> {
  const db = getDb();
  await db.insert(users).values({ id: userId }).onConflictDoNothing();
}

export async function listJourneys(userId: string): Promise<LearningJourney[]> {
  const db = getDb();
  const [journeyRows, stepRows, reviewRows] = await Promise.all([
    db.select().from(journeys).where(eq(journeys.userId, userId)),
    db
      .select()
      .from(steps)
      .where(eq(steps.userId, userId))
      .orderBy(asc(steps.seq)),
    db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, userId))
      .orderBy(asc(reviews.seq)),
  ]);

  const assembled = journeyRows.map((row) =>
    assembleJourney(
      row,
      stepRows.filter((s) => s.journeyId === row.id).map((s) => s.payload),
      reviewRows.filter((r) => r.journeyId === row.id).map((r) => r.payload),
    ),
  );

  // Heal live-repo journeys saved without their model (or rows predating the
  // model-persistence fix) from the shared analyses table.
  for (const journey of assembled) {
    if (!journey.model && journey.repoId.startsWith("gh:")) {
      const rows = await db
        .select({ model: analysesTable.model })
        .from(analysesTable)
        .where(eq(analysesTable.repoId, journey.repoId))
        .orderBy(desc(analysesTable.createdAt))
        .limit(1);
      if (rows.length > 0) {
        journey.model = rows[0].model as LearningJourney["model"];
      }
    }
  }
  return assembled;
}

export async function upsertJourney(
  userId: string,
  journey: LearningJourney,
): Promise<void> {
  const db = getDb();
  const row = journeyToRow(journey);

  // A journey id reused with a different createdAt is a restart — the old
  // evidence must not resurface under the new run.
  const existing = await db
    .select({ createdAt: journeys.createdAt })
    .from(journeys)
    .where(and(eq(journeys.userId, userId), eq(journeys.id, journey.id)));
  if (existing.length > 0 && existing[0].createdAt !== row.createdAt) {
    await db
      .delete(steps)
      .where(and(eq(steps.userId, userId), eq(steps.journeyId, journey.id)));
    await db
      .delete(reviews)
      .where(
        and(eq(reviews.userId, userId), eq(reviews.journeyId, journey.id)),
      );
  }

  await db
    .insert(journeys)
    .values({
      userId,
      ...row,
      learner: row.learner as object,
      model: row.model as object | null,
    })
    .onConflictDoUpdate({
      target: [journeys.userId, journeys.id],
      set: {
        goal: row.goal,
        goalLabel: row.goalLabel,
        questionStyle: row.questionStyle,
        createdAt: row.createdAt,
        lastActiveAt: row.lastActiveAt,
        learner: row.learner as object,
        model: row.model as object | null,
      },
    });

  if (journey.steps.length > 0) {
    await db
      .insert(steps)
      .values(
        journey.steps.map((payload, i) => ({
          userId,
          journeyId: journey.id,
          seq: i + 1,
          payload: payload as object,
        })),
      )
      .onConflictDoNothing();
  }
  if (journey.reviews.length > 0) {
    await db
      .insert(reviews)
      .values(
        journey.reviews.map((payload, i) => ({
          userId,
          journeyId: journey.id,
          seq: i + 1,
          payload: payload as object,
        })),
      )
      .onConflictDoNothing();
  }
}

// Restart support: drops the journey and its evidence entirely.
export async function deleteJourney(
  userId: string,
  journeyId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(steps)
    .where(and(eq(steps.userId, userId), eq(steps.journeyId, journeyId)));
  await db
    .delete(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.journeyId, journeyId)));
  await db
    .delete(journeys)
    .where(and(eq(journeys.userId, userId), eq(journeys.id, journeyId)));
}
