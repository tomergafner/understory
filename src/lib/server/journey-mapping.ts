import type {
  Goal,
  LearnerState,
  LearningJourney,
  QuestionStyle,
  ReviewRecord,
  StepRecord,
} from "../types";

// Pure mapping between the app's LearningJourney and its durable rows —
// kept free of DB imports so round-tripping is unit-testable.

export interface JourneyRow {
  id: string;
  repoId: string;
  repoDisplayName: string;
  goal: string;
  goalLabel: string;
  questionStyle: string;
  createdAt: number;
  lastActiveAt: number;
  learner: unknown;
}

export function journeyToRow(journey: LearningJourney): JourneyRow {
  return {
    id: journey.id,
    repoId: journey.repoId,
    repoDisplayName: journey.repoDisplayName,
    goal: journey.goal,
    goalLabel: journey.goalLabel,
    questionStyle: journey.questionStyle,
    createdAt: journey.createdAt,
    lastActiveAt: journey.lastActiveAt,
    learner: journey.learner,
  };
}

export function assembleJourney(
  row: JourneyRow,
  stepPayloads: unknown[],
  reviewPayloads: unknown[],
): LearningJourney {
  return {
    id: row.id,
    repoId: row.repoId,
    repoDisplayName: row.repoDisplayName,
    goal: row.goal as Goal,
    goalLabel: row.goalLabel,
    questionStyle: row.questionStyle as QuestionStyle,
    createdAt: row.createdAt,
    lastActiveAt: row.lastActiveAt,
    learner: row.learner as LearnerState,
    steps: stepPayloads as StepRecord[],
    reviews: reviewPayloads as ReviewRecord[],
  };
}
