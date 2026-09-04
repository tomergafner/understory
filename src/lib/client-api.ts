import type { ReviewPlan } from "./engine";
import type {
  LearningJourney,
  Lesson,
  Question,
  RepositoryModel,
  StepOutcome,
} from "./types";

// Client → server calls for the adaptive loop. The server decides whether the
// response comes from Claude or the fixture fallback; `source` reports which.

export type ContentSource = "model" | "fixture";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { message?: string; error?: string }).message ??
        (data as { error?: string }).error ??
        `request failed (${res.status})`,
    );
  }
  return res.json() as Promise<T>;
}

export function fetchLesson(
  journey: LearningJourney,
  conceptId: string,
): Promise<{ source: ContentSource; lesson: Lesson }> {
  return post("/api/lesson", {
    repoId: journey.repoId,
    conceptId,
    goal: journey.goal,
    questionStyle: journey.questionStyle,
    learner: journey.learner,
    recentAdaptation: journey.learner.recommendedNext?.reason ?? null,
    ...(journey.model ? { model: journey.model } : {}),
  });
}

export function fetchAssess(
  journey: LearningJourney,
  lesson: Lesson,
  asked: Question[],
  answers: Record<string, string>,
): Promise<{ source: ContentSource; outcome: StepOutcome }> {
  return post("/api/assess", {
    repoId: journey.repoId,
    conceptId: lesson.conceptId,
    lessonTitle: lesson.title,
    goal: journey.goal,
    questionStyle: journey.questionStyle,
    questions: asked,
    answers,
    learner: journey.learner,
    ...(journey.model ? { model: journey.model } : {}),
  });
}

export function fetchReviewPlan(
  journey: LearningJourney,
  kind: "last_lesson" | "broad",
  lastConceptId: string | null,
): Promise<{ source: ContentSource; plan: ReviewPlan }> {
  return post("/api/review", {
    repoId: journey.repoId,
    goal: journey.goal,
    kind,
    learner: journey.learner,
    lastConceptId,
    ...(journey.model ? { model: journey.model } : {}),
  });
}

export function fetchAnalysis(url: string): Promise<{
  status: "partial" | "done";
  model: RepositoryModel;
  deepFailed?: boolean;
}> {
  return post("/api/analyze", { url });
}
