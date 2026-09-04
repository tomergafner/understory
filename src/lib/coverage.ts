import type { Goal, LearnerState, RepositoryModel } from "./types";

// Coverage semantics (docs/DECISIONS.md 005): progress measures traversal of the
// goal-scoped curriculum, never mastery. A concept enters scope either because the
// goal includes it, or because the adaptive path pulled it in (any non-untaught
// status) — so remediation can grow the denominator, and the UI explains the dip.

const CREDIT: Record<string, number> = {
  untaught: 0,
  taught_untested: 0.5,
  understood: 1,
  partial: 1,
  misconception: 1, // assessed counts as traversed; low mastery drives review instead
};

export interface CoverageResult {
  percent: number;
  inScopeConceptIds: string[];
  addedByAdaptation: string[]; // in scope only because the path pulled them in
}

export function computeCoverage(
  model: RepositoryModel,
  goal: Goal,
  learner: LearnerState,
): CoverageResult {
  const inScope = model.concepts.filter((c) => {
    const status = learner.conceptStatus[c.id] ?? "untaught";
    return (
      c.goals.includes(goal) ||
      status !== "untaught" ||
      learner.recommendedNext?.conceptId === c.id
    );
  });

  const addedByAdaptation = inScope
    .filter((c) => !c.goals.includes(goal))
    .map((c) => c.id);

  const totalWeight = inScope.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) {
    return { percent: 0, inScopeConceptIds: [], addedByAdaptation: [] };
  }

  const earned = inScope.reduce((sum, c) => {
    const status = learner.conceptStatus[c.id] ?? "untaught";
    return sum + c.weight * (CREDIT[status] ?? 0);
  }, 0);

  return {
    percent: Math.round((100 * earned) / totalWeight),
    inScopeConceptIds: inScope.map((c) => c.id),
    addedByAdaptation,
  };
}
