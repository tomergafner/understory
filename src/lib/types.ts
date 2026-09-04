// v0 types — expected to evolve before Phase 4 persistence (see docs/DECISIONS.md 004).
// Keep loose; do not build abstractions on top of these yet.

export type Goal = "understand" | "use" | "architecture" | "contribute";
export type QuestionStyle = "mc" | "free" | "mixed";

export type ConceptStatus =
  | "untaught"
  | "taught_untested"
  | "understood"
  | "partial"
  | "misconception";

export interface CodeExcerpt {
  path: string;
  startLine: number;
  endLine: number;
  code: string;
}

export interface Concept {
  id: string;
  title: string;
  summary: string; // one-liner used in prompts and curriculum context
  level: number; // curriculum level 1-7
  weight: number; // importance for coverage
  goals: Goal[]; // goals whose curriculum includes this concept
  prerequisites: string[];
}

export interface RepositoryModel {
  id: string;
  repoUrl: string;
  owner: string;
  name: string;
  commitLabel: string; // fixture: tag/sha label shown in UI
  description: string;
  languages: string[];
  concepts: Concept[];
  // Stage-1 starter analysis (README-only); a deep pass is running behind it.
  partial?: boolean;
  // The deep pass failed; learning continues on the starter curriculum.
  deepFailed?: boolean;
}

export interface McOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  kind: "mc" | "free";
  prompt: string;
  options?: McOption[];
  correctOptionId?: string;
  // fixture-only heuristic for free-form answers; replaced by real grading in Phase 3
  expectedKeywords?: string[];
  // always asked regardless of question-style preference (e.g. drives a branch)
  essential?: boolean;
}

export interface Assessment {
  mastery: number; // 0..1
  conceptsDemonstrated: string[];
  misconceptions: string[];
  missingPoints: string[];
  feedback: string;
  recommendedAction: "advance" | "reinforce" | "remediate";
  confidence: number; // 0..1
}

export interface Lesson {
  conceptId: string;
  title: string;
  kicker: string; // small label above the title, e.g. "Level 1 · The mental model"
  paragraphs: string[];
  excerpt?: CodeExcerpt;
  questions: Question[];
}

// The outcome of grading + deciding after a lesson step — produced either by
// a fixture script (Phase 1) or by the server's Claude call (Phase 3). The
// engine applies it to the journey deterministically either way.
export interface StepOutcome {
  assessment: Assessment;
  adaptationMessage: string;
  nextConceptId: string | null;
  conceptStatus: "understood" | "partial" | "misconception";
  correct: Record<string, boolean>;
}

export interface StepRecord {
  id: string;
  conceptId: string;
  answers: Record<string, string>; // questionId -> optionId | free text
  correct: Record<string, boolean>;
  assessment: Assessment;
  adaptationMessage: string;
  nextConceptId: string | null;
  completedAt: number;
}

export interface ReviewRecord {
  id: string;
  kind: "last_lesson" | "broad";
  conceptIds: string[];
  answers: Record<string, string>;
  correct: Record<string, boolean>;
  feedback: string;
  completedAt: number;
}

export interface MasteryEntry {
  score: number; // 0..1
  confidence: number; // 0..1
  lastTestedAt: number | null;
}

export interface LearnerState {
  conceptStatus: Record<string, ConceptStatus>;
  mastery: Record<string, MasteryEntry>;
  recommendedNext: {
    action: "advance" | "reinforce" | "remediate";
    conceptId: string | null;
    reason: string;
  } | null;
}

export interface LearningJourney {
  id: string;
  repoId: string;
  // Present for live-analyzed repos; fixture repos resolve their model from code.
  model?: RepositoryModel;
  repoDisplayName: string;
  goal: Goal;
  goalLabel: string;
  questionStyle: QuestionStyle;
  createdAt: number;
  lastActiveAt: number;
  steps: StepRecord[];
  reviews: ReviewRecord[];
  learner: LearnerState;
}
