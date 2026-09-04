import {
  bigint,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Minimal durable schema (CLAUDE.md §8, kept small on purpose).
// Keyed columns exist only for what we query (user, repo, recency);
// evolving structures (learner state, step/review records) live in jsonb —
// the data model is still expected to shift (docs/DECISIONS.md 013).

export const users = pgTable("users", {
  id: text("id").primaryKey(), // durable anonymous browser identity (uuid)
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const journeys = pgTable(
  "journeys",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    id: text("id").notNull(), // client-scoped id, e.g. "demo-express"
    repoId: text("repo_id").notNull(),
    repoDisplayName: text("repo_display_name").notNull(),
    goal: text("goal").notNull(),
    goalLabel: text("goal_label").notNull(),
    questionStyle: text("question_style").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(), // epoch ms
    lastActiveAt: bigint("last_active_at", { mode: "number" }).notNull(),
    learner: jsonb("learner").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

// Append-only assessment evidence: one row per completed tutorial step.
export const steps = pgTable(
  "steps",
  {
    userId: text("user_id").notNull(),
    journeyId: text("journey_id").notNull(),
    seq: integer("seq").notNull(),
    payload: jsonb("payload").notNull(), // StepRecord
  },
  (t) => [primaryKey({ columns: [t.userId, t.journeyId, t.seq] })],
);

export const reviews = pgTable(
  "reviews",
  {
    userId: text("user_id").notNull(),
    journeyId: text("journey_id").notNull(),
    seq: integer("seq").notNull(),
    payload: jsonb("payload").notNull(), // ReviewRecord
  },
  (t) => [primaryKey({ columns: [t.userId, t.journeyId, t.seq] })],
);
