import type { CodeExcerpt, Lesson, Question, RepositoryModel } from "./types";
import {
  decideAfterLesson1,
  decideAfterLevel4,
  expressEvidence,
  expressLessons,
  expressModel,
  expressReviewBank,
  type LessonOutcome,
} from "./fixtures/express";
import {
  fastapiEvidence,
  fastapiLessons,
  fastapiModel,
  fastapiReviewBank,
} from "./fixtures/fastapi";

// Fixture content registry. In Phase 3+ lessons and decisions come from Claude;
// this registry keeps the UI and engine oblivious to where content originates.

export type DecideFn = (correct: Record<string, boolean>) => LessonOutcome;

interface RepoContent {
  model: RepositoryModel;
  lessons: Record<string, Lesson>;
  reviewBank: Record<string, Question[]>;
  decide: Record<string, DecideFn>;
  evidence: Record<string, CodeExcerpt>;
}

function fastapiDecide(): DecideFn {
  return (correct) => {
    const allRight = Object.values(correct).every(Boolean);
    return {
      conceptStatus: allRight ? "understood" : "partial",
      nextConceptId: "routing-groups",
      adaptationMessage: allRight
        ? "Dependency resolution is placed — declared needs, a per-request tree, a cache. Next: how routers compose whole apps out of these pieces."
        : "The per-request cache is the part that slipped — worth one more look, because it's what makes shared dependencies cheap. We'll check it again before composition.",
      assessment: {
        mastery: allRight ? 0.85 : 0.55,
        conceptsDemonstrated: allRight ? ["dependency resolution and caching"] : [],
        misconceptions: [],
        missingPoints: allRight ? [] : ["per-request dependency cache"],
        feedback: allRight
          ? "You traced resolution as a mechanism, not magic."
          : "Revisit how often a repeated dependency actually runs during one request.",
        recommendedAction: allRight ? "advance" : "reinforce",
        confidence: 0.75,
      },
    };
  };
}

const registry: Record<string, RepoContent> = {
  express: {
    model: expressModel,
    lessons: expressLessons,
    reviewBank: expressReviewBank,
    decide: {
      "middleware-pipeline": decideAfterLesson1,
      "routing-layer": (c) => decideAfterLevel4("routing-layer", c),
      "router-stack": (c) => decideAfterLevel4("router-stack", c),
    },
    evidence: {
      ...expressEvidence,
      // lesson excerpts double as evidence for their concepts
      "middleware-pipeline": expressLessons["middleware-pipeline"].excerpt!,
      "routing-layer": expressLessons["routing-layer"].excerpt!,
      "router-stack": expressLessons["router-stack"].excerpt!,
    },
  },
  fastapi: {
    model: fastapiModel,
    lessons: fastapiLessons,
    reviewBank: fastapiReviewBank,
    decide: {
      "dependency-injection": fastapiDecide(),
    },
    evidence: {
      ...fastapiEvidence,
      "dependency-injection": fastapiLessons["dependency-injection"].excerpt!,
    },
  },
};

export function getRepoContent(repoId: string): RepoContent {
  const content = registry[repoId];
  if (!content) throw new Error(`Unknown fixture repo: ${repoId}`);
  return content;
}

export function getLesson(repoId: string, conceptId: string): Lesson | null {
  return getRepoContent(repoId).lessons[conceptId] ?? null;
}

export function getConceptTitle(repoId: string, conceptId: string): string {
  const concept = getRepoContent(repoId).model.concepts.find((c) => c.id === conceptId);
  return concept?.title ?? conceptId;
}
