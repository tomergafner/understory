import type { Question } from "./types";

// Multiple choice is graded deterministically by application code (CLAUDE.md §7).
export function gradeMc(question: Question, optionId: string): boolean {
  if (question.kind !== "mc" || !question.correctOptionId) return false;
  return optionId === question.correctOptionId;
}

// Fixture-only stand-in for semantic grading, replaced by Claude in Phase 3.
// Counts an answer as showing understanding if it touches any expected keyword.
export function gradeFreeFixture(question: Question, text: string): boolean {
  const keywords = question.expectedKeywords ?? [];
  if (keywords.length === 0) return text.trim().length > 0;
  const normalized = text.toLowerCase();
  return keywords.some((k) => normalized.includes(k.toLowerCase()));
}

export function gradeAnswer(question: Question, answer: string): boolean {
  return question.kind === "mc"
    ? gradeMc(question, answer)
    : gradeFreeFixture(question, answer);
}
