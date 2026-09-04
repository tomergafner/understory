import { getRepoContent } from "@/lib/content";
import { genericOutcome, nextUntaughtConcept } from "@/lib/engine";
import { gradeFreeFixture, gradeMc } from "@/lib/grading";
import { hasApiKey } from "@/lib/server/anthropic";
import { callModel } from "@/lib/server/model-call";
import { buildAssessPrompt } from "@/lib/server/prompts";
import { AssessRequestSchema, StepDecisionSchema } from "@/lib/server/schemas";
import type { LearnerState, Question, StepOutcome } from "@/lib/types";

export async function POST(req: Request) {
  let body;
  try {
    body = AssessRequestSchema.parse(await req.json());
    getRepoContent(body.repoId);
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const questions = body.questions as Question[];
  const learner = body.learner as LearnerState;

  // MC grading is deterministic application code — never the model's call.
  const mcResults: Record<string, boolean> = {};
  for (const q of questions) {
    if (q.kind === "mc") mcResults[q.id] = gradeMc(q, body.answers[q.id] ?? "");
  }

  const fixtureOutcome = (): StepOutcome => {
    const correct = { ...mcResults };
    for (const q of questions) {
      if (q.kind === "free")
        correct[q.id] = gradeFreeFixture(q, body.answers[q.id] ?? "");
    }
    const decide = getRepoContent(body.repoId).decide[body.conceptId];
    return decide
      ? { ...decide(correct), correct }
      : genericOutcome(body.repoId, body.goal, learner, body.conceptId, correct);
  };

  if (!hasApiKey()) {
    return Response.json({ source: "fixture", outcome: fixtureOutcome() });
  }

  try {
    const decision = await callModel(
      "assess",
      buildAssessPrompt({
        repoId: body.repoId,
        conceptId: body.conceptId,
        lessonTitle: body.lessonTitle,
        goal: body.goal,
        learner,
        questions,
        answers: body.answers,
        mcResults,
      }),
      StepDecisionSchema,
    );

    // Merge correctness: deterministic MC results win; model grades free-form.
    const correct = { ...mcResults };
    for (const q of questions) {
      if (q.kind === "free") {
        const grade = decision.freeFormGrades.find(
          (f) => f.questionId === q.id,
        );
        correct[q.id] = grade?.correct ?? false;
      }
    }

    // Guardrail: the next concept must exist; otherwise fall back to the
    // deterministic choice (state transitions should not be probabilistic).
    const { model } = getRepoContent(body.repoId);
    let nextConceptId = decision.nextConceptId;
    if (nextConceptId && !model.concepts.some((c) => c.id === nextConceptId)) {
      nextConceptId = nextUntaughtConcept(body.repoId, body.goal, {
        ...learner,
        conceptStatus: {
          ...learner.conceptStatus,
          [body.conceptId]: "understood",
        },
      });
    }

    // Status mapping is deterministic (CLAUDE.md §7).
    const conceptStatus =
      decision.assessment.misconceptions.length > 0
        ? ("misconception" as const)
        : decision.assessment.mastery >= 0.75
          ? ("understood" as const)
          : ("partial" as const);

    const outcome: StepOutcome = {
      assessment: decision.assessment,
      adaptationMessage: decision.adaptationMessage,
      nextConceptId,
      conceptStatus,
      correct,
    };
    return Response.json({ source: "model", outcome });
  } catch (err) {
    console.error("assess: model path failed, using fixture fallback", err);
    return Response.json({ source: "fixture", outcome: fixtureOutcome() });
  }
}
