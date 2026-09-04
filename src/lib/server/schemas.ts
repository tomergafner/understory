import { z } from "zod";

// Structured-output contracts between Claude and the application (CLAUDE.md §6).
// Nothing the model returns becomes state without passing one of these.
// Numeric range checks are validated client-side by the SDK's parse() helper.

export const GeneratedQuestionSchema = z.object({
  id: z.string(),
  kind: z.enum(["mc", "free"]),
  prompt: z.string(),
  options: z
    .array(z.object({ id: z.string(), label: z.string() }))
    .nullable()
    .describe("3-4 options for mc questions; null for free"),
  correctOptionId: z.string().nullable(),
});

export const GeneratedLessonSchema = z.object({
  title: z.string().describe("Short, concrete, non-clickbait"),
  kicker: z.string().describe("e.g. 'Level 4 · Architecture'"),
  paragraphs: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("2-3 calm paragraphs; analogy where it helps; grounded in evidence"),
  useExcerpt: z
    .boolean()
    .describe("true when showing the provided code evidence aids the lesson"),
  questions: z.array(GeneratedQuestionSchema).min(1).max(3),
});
export type GeneratedLesson = z.infer<typeof GeneratedLessonSchema>;

export const AssessmentSchema = z.object({
  mastery: z.number().min(0).max(1),
  conceptsDemonstrated: z.array(z.string()),
  misconceptions: z.array(z.string()),
  missingPoints: z.array(z.string()),
  feedback: z.string().describe("brief, evidence-based, non-patronizing"),
  recommendedAction: z.enum(["advance", "reinforce", "remediate"]),
  confidence: z.number().min(0).max(1),
});

export const StepDecisionSchema = z.object({
  freeFormGrades: z
    .array(
      z.object({
        questionId: z.string(),
        correct: z.boolean(),
        note: z.string().nullable(),
      }),
    )
    .describe("one entry per free-form question; MC is graded by the application"),
  assessment: AssessmentSchema,
  adaptationMessage: z
    .string()
    .describe(
      "names what the answers revealed and where the path goes next, and why",
    ),
  nextConceptId: z
    .string()
    .nullable()
    .describe("must be a concept id from the provided curriculum"),
});
export type StepDecision = z.infer<typeof StepDecisionSchema>;

export const ReviewPlanSchema = z.object({
  conceptIds: z.array(z.string()).min(1).max(2),
  reason: z
    .string()
    .describe("one visible sentence on why these concepts were chosen"),
  questions: z
    .array(GeneratedQuestionSchema)
    .min(1)
    .max(3)
    .describe("multiple choice only; fresh questions, not lesson repeats"),
});
export type ReviewPlanOut = z.infer<typeof ReviewPlanSchema>;

// ---- Request bodies (inbound validation) ----

const LearnerSchema = z.object({
  conceptStatus: z.record(z.string(), z.string()),
  mastery: z.record(
    z.string(),
    z.object({
      score: z.number(),
      confidence: z.number(),
      lastTestedAt: z.number().nullable(),
    }),
  ),
  recommendedNext: z
    .object({
      action: z.string(),
      conceptId: z.string().nullable(),
      reason: z.string(),
    })
    .nullable(),
});

export const LessonRequestSchema = z.object({
  repoId: z.string(),
  conceptId: z.string(),
  goal: z.enum(["understand", "use", "architecture", "contribute"]),
  questionStyle: z.enum(["mc", "free", "mixed"]),
  learner: LearnerSchema,
  recentAdaptation: z.string().nullable().optional(),
});

export const AssessRequestSchema = z.object({
  repoId: z.string(),
  conceptId: z.string(),
  lessonTitle: z.string(),
  goal: z.enum(["understand", "use", "architecture", "contribute"]),
  questionStyle: z.enum(["mc", "free", "mixed"]),
  questions: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["mc", "free"]),
      prompt: z.string(),
      options: z
        .array(z.object({ id: z.string(), label: z.string() }))
        .optional(),
      correctOptionId: z.string().optional(),
      expectedKeywords: z.array(z.string()).optional(),
      essential: z.boolean().optional(),
    }),
  ),
  answers: z.record(z.string(), z.string()),
  learner: LearnerSchema,
});

export const ReviewRequestSchema = z.object({
  repoId: z.string(),
  goal: z.enum(["understand", "use", "architecture", "contribute"]),
  kind: z.enum(["last_lesson", "broad"]),
  learner: LearnerSchema,
  lastConceptId: z.string().nullable(),
});
