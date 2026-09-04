import { getRepoContent } from "./content";
import { gradeAnswer } from "./grading";
import type {
  Lesson,
  LearningJourney,
  Question,
  RepositoryModel,
  ReviewRecord,
  StepOutcome,
  StepRecord,
} from "./types";

// Pure journey-state transitions. No storage, no React, no model calls —
// this is the deterministic core that Phase 3 keeps while swapping fixture
// decide() functions for real Claude decisions.

export function newDemoJourney(now: number): LearningJourney {
  return {
    id: "demo-express",
    repoId: "express",
    repoDisplayName: "expressjs/express",
    goal: "architecture",
    goalLabel: "Understand the architecture",
    questionStyle: "mixed",
    createdAt: now,
    lastActiveAt: now,
    steps: [],
    reviews: [],
    learner: {
      conceptStatus: {},
      mastery: {},
      recommendedNext: {
        action: "advance",
        conceptId: "middleware-pipeline",
        reason: "Start with the mental model everything else builds on.",
      },
    },
  };
}

// Journey for a freshly analyzed live repository; goal is finalized during
// onboarding (all four goals are available, unlike the fixture demo).
export function newLiveJourney(
  model: RepositoryModel,
  questionStyle: LearningJourney["questionStyle"],
  now: number,
): LearningJourney {
  const goal = "architecture" as const;
  const firstId = nextUntaughtConcept(model, goal, {
    conceptStatus: {},
    mastery: {},
    recommendedNext: null,
  });
  return {
    id: model.id.replace(/[:/]/g, "-"), // gh:owner/repo -> gh-owner-repo
    repoId: model.id,
    model,
    repoDisplayName: `${model.owner}/${model.name}`,
    goal,
    goalLabel: "Understand the architecture",
    questionStyle,
    createdAt: now,
    lastActiveAt: now,
    steps: [],
    reviews: [],
    learner: {
      conceptStatus: {},
      mastery: {},
      recommendedNext: firstId
        ? {
            action: "advance",
            conceptId: firstId,
            reason: "Starting at the beginning of the curriculum.",
          }
        : null,
    },
  };
}

export function seedFastapiJourney(now: number): LearningJourney {
  const twoDays = 2 * 24 * 60 * 60 * 1000;
  const old = now - 9 * 24 * 60 * 60 * 1000;
  const recent = now - twoDays;
  return {
    id: "seed-fastapi",
    repoId: "fastapi",
    repoDisplayName: "fastapi/fastapi",
    goal: "architecture",
    goalLabel: "Understand the architecture",
    questionStyle: "mixed",
    createdAt: old,
    lastActiveAt: recent,
    steps: [],
    reviews: [],
    learner: {
      conceptStatus: {
        "what-is-fastapi": "understood",
        "path-operations": "understood",
        "pydantic-validation": "understood",
        "async-endpoints": "understood",
        "openapi-docs": "understood",
        "dependency-injection": "taught_untested",
      },
      mastery: {
        "what-is-fastapi": { score: 0.9, confidence: 0.9, lastTestedAt: old },
        "path-operations": { score: 0.85, confidence: 0.8, lastTestedAt: recent },
        "pydantic-validation": { score: 0.55, confidence: 0.5, lastTestedAt: old },
        "async-endpoints": { score: 0.6, confidence: 0.5, lastTestedAt: old },
        "openapi-docs": { score: 0.8, confidence: 0.7, lastTestedAt: recent },
      },
      recommendedNext: {
        action: "advance",
        conceptId: "dependency-injection",
        reason: "Taught last session but not yet tested.",
      },
    },
  };
}

export interface SubmitResult {
  journey: LearningJourney;
  step: StepRecord;
}

// The first in-scope concept the learner hasn't been taught — the
// deterministic fallback when a model decision is missing or invalid.
export function nextUntaughtConcept(
  model: RepositoryModel,
  goal: LearningJourney["goal"],
  learner: LearningJourney["learner"],
): string | null {
  const candidate = model.concepts.find((c) => {
    const status = learner.conceptStatus[c.id] ?? "untaught";
    return c.goals.includes(goal) && status === "untaught";
  });
  return candidate?.id ?? null;
}

// Deterministic application of a step outcome — the single state-update path
// shared by fixture scripts and server (Claude) decisions.
export function applyStepOutcome(
  journey: LearningJourney,
  conceptId: string,
  answers: Record<string, string>,
  outcome: StepOutcome,
  now: number,
): SubmitResult {
  const step: StepRecord = {
    id: `step-${journey.steps.length + 1}`,
    conceptId,
    answers,
    correct: outcome.correct,
    assessment: outcome.assessment,
    adaptationMessage: outcome.adaptationMessage,
    nextConceptId: outcome.nextConceptId,
    completedAt: now,
  };

  const updated: LearningJourney = {
    ...journey,
    lastActiveAt: now,
    steps: [...journey.steps, step],
    learner: {
      ...journey.learner,
      conceptStatus: {
        ...journey.learner.conceptStatus,
        [conceptId]: outcome.conceptStatus,
      },
      mastery: {
        ...journey.learner.mastery,
        [conceptId]: {
          score: outcome.assessment.mastery,
          confidence: outcome.assessment.confidence,
          lastTestedAt: now,
        },
      },
      recommendedNext: outcome.nextConceptId
        ? {
            action: outcome.assessment.recommendedAction,
            conceptId: outcome.nextConceptId,
            reason: outcome.adaptationMessage,
          }
        : null,
    },
  };

  return { journey: updated, step };
}

// Generic outcome for concepts without a scripted decide() — keeps the
// fixture fallback working at any curriculum depth.
export function genericOutcome(
  model: RepositoryModel,
  goal: LearningJourney["goal"],
  learner: LearningJourney["learner"],
  conceptId: string,
  correct: Record<string, boolean>,
): StepOutcome {
  const wrong = Object.values(correct).filter((v) => !v).length;
  const allRight = wrong === 0;
  const nextId = nextUntaughtConcept(model, goal, {
    ...learner,
    conceptStatus: { ...learner.conceptStatus, [conceptId]: "understood" },
  });
  return {
    conceptStatus: allRight ? "understood" : "partial",
    nextConceptId: nextId,
    adaptationMessage: allRight
      ? "That landed. Your path continues to the next concept in scope."
      : "Part of that is still soft — we'll keep it in view as we continue.",
    correct,
    assessment: {
      mastery: allRight ? 0.85 : 0.55,
      conceptsDemonstrated: [],
      misconceptions: [],
      missingPoints: [],
      feedback: allRight
        ? "All answers correct."
        : "Some answers missed — worth a second look before moving deep.",
      recommendedAction: allRight ? "advance" : "reinforce",
      confidence: 0.6,
    },
  };
}

// Fixture-path submission: grade deterministically, run the scripted (or
// generic) decision, apply. The server route mirrors this shape with a
// Claude decision instead. Grades only the questions actually asked.
export function submitLesson(
  journey: LearningJourney,
  lesson: Lesson,
  asked: Question[],
  answers: Record<string, string>,
  now: number,
): SubmitResult {
  const content = getRepoContent(journey.repoId);
  const correct: Record<string, boolean> = {};
  for (const q of asked) {
    correct[q.id] = gradeAnswer(q, answers[q.id] ?? "");
  }

  const decide = content.decide[lesson.conceptId];
  const outcome: StepOutcome = decide
    ? { ...decide(correct), correct }
    : genericOutcome(
        content.model,
        journey.goal,
        journey.learner,
        lesson.conceptId,
        correct,
      );

  return applyStepOutcome(journey, lesson.conceptId, answers, outcome, now);
}

export interface ReviewPlan {
  kind: "last_lesson" | "broad";
  conceptIds: string[];
  questions: Question[];
  reason: string;
}

export function lastTaughtConceptId(journey: LearningJourney): string | null {
  return (
    journey.steps.at(-1)?.conceptId ??
    journey.learner.recommendedNext?.conceptId ??
    null
  );
}

// Journey-free form usable by both the client fixture path and the server
// fallback (the server only receives learner state, not the whole journey).
export function planReviewFrom(
  repoId: string,
  learner: LearningJourney["learner"],
  kind: "last_lesson" | "broad",
  lastConceptId: string | null,
): ReviewPlan | null {
  const content = getRepoContent(repoId);

  if (kind === "last_lesson") {
    if (!lastConceptId) return null;
    const bank = content.reviewBank[lastConceptId];
    const questions =
      bank ?? content.lessons[lastConceptId]?.questions.slice(0, 2) ?? [];
    if (questions.length === 0) return null;
    return {
      kind,
      conceptIds: [lastConceptId],
      questions: questions.slice(0, 3),
      reason: "Testing the most recent lesson before continuing.",
    };
  }

  // Broad review: sample assessed concepts, weakest and stalest first.
  const assessed = Object.entries(learner.mastery)
    .map(([conceptId, m]) => ({ conceptId, ...m }))
    .sort(
      (a, b) =>
        a.score - b.score || (a.lastTestedAt ?? 0) - (b.lastTestedAt ?? 0),
    );

  const picked: { conceptId: string; question: Question }[] = [];
  for (const entry of assessed) {
    const bank = content.reviewBank[entry.conceptId];
    if (bank && bank.length > 0) {
      picked.push({ conceptId: entry.conceptId, question: bank[0] });
    }
    if (picked.length === 2) break;
  }
  if (picked.length === 0) return null;

  return {
    kind,
    conceptIds: picked.map((p) => p.conceptId),
    questions: picked.map((p) => p.question),
    reason:
      "Sampled from what you've covered, weighted toward concepts that looked weak or haven't been tested recently.",
  };
}

export function planReview(
  journey: LearningJourney,
  kind: "last_lesson" | "broad",
): ReviewPlan | null {
  return planReviewFrom(
    journey.repoId,
    journey.learner,
    kind,
    lastTaughtConceptId(journey),
  );
}

export function submitReview(
  journey: LearningJourney,
  plan: ReviewPlan,
  answers: Record<string, string>,
  now: number,
): { journey: LearningJourney; review: ReviewRecord } {
  const correct: Record<string, boolean> = {};
  for (const q of plan.questions) {
    correct[q.id] = gradeAnswer(q, answers[q.id] ?? "");
  }
  const rightCount = Object.values(correct).filter(Boolean).length;
  const allRight = rightCount === plan.questions.length;

  // Map each question back to its concept to update mastery per concept.
  const conceptOfQuestion = (q: Question): string => {
    if (plan.kind === "last_lesson") return plan.conceptIds[0];
    const idx = plan.questions.findIndex((pq) => pq.id === q.id);
    return plan.conceptIds[Math.min(idx, plan.conceptIds.length - 1)];
  };

  const mastery = { ...journey.learner.mastery };
  const conceptStatus = { ...journey.learner.conceptStatus };
  for (const q of plan.questions) {
    const conceptId = conceptOfQuestion(q);
    const prev = mastery[conceptId] ?? { score: 0.5, confidence: 0.4, lastTestedAt: null };
    const target = correct[q.id] ? 1 : 0.25;
    mastery[conceptId] = {
      score: Math.round((prev.score * 0.5 + target * 0.5) * 100) / 100,
      confidence: Math.min(1, prev.confidence + 0.2),
      lastTestedAt: now,
    };
    if (conceptStatus[conceptId] === "taught_untested") {
      conceptStatus[conceptId] = correct[q.id] ? "understood" : "partial";
    } else if (!correct[q.id]) {
      conceptStatus[conceptId] = "partial";
    }
  }

  const weakest = plan.conceptIds.find((id) =>
    plan.questions.some((q) => conceptOfQuestion(q) === id && !correct[q.id]),
  );

  const review: ReviewRecord = {
    id: `review-${journey.reviews.length + 1}`,
    kind: plan.kind,
    conceptIds: plan.conceptIds,
    answers,
    correct,
    feedback: allRight
      ? "Retained. Your path continues where it was headed."
      : "That gap updates your path — we'll reinforce before moving deeper.",
    completedAt: now,
  };

  const updated: LearningJourney = {
    ...journey,
    lastActiveAt: now,
    reviews: [...journey.reviews, review],
    learner: {
      ...journey.learner,
      mastery,
      conceptStatus,
      recommendedNext:
        !allRight && weakest
          ? {
              action: "reinforce",
              conceptId: weakest,
              reason: "Review exposed a gap here.",
            }
          : journey.learner.recommendedNext,
    },
  };

  return { journey: updated, review };
}
