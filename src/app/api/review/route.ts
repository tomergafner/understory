import { planReviewFrom, type ReviewPlan } from "@/lib/engine";
import { hasApiKey } from "@/lib/server/anthropic";
import { resolveContent } from "@/lib/server/content-resolver";
import { callModel } from "@/lib/server/model-call";
import { buildReviewPrompt } from "@/lib/server/prompts";
import { ReviewPlanSchema, ReviewRequestSchema } from "@/lib/server/schemas";
import type { LearnerState, Question, RepositoryModel } from "@/lib/types";

export async function POST(req: Request) {
  const parsed = ReviewRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const body = parsed.data;

  let content;
  try {
    content = await resolveContent(body.repoId);
  } catch {
    // Partial-analysis phase: no stored analysis yet, but the journey carries
    // its starter model (no evidence until the deep pass lands).
    if (body.model) {
      content = {
        model: body.model as RepositoryModel,
        evidence: {},
        isFixture: false,
      };
    } else {
      return Response.json({ error: "unknown_repo" }, { status: 404 });
    }
  }

  const learner = body.learner as LearnerState;

  const fixture = () => {
    if (!content.isFixture) return null;
    const plan = planReviewFrom(
      body.repoId,
      learner,
      body.kind,
      body.lastConceptId,
    );
    return plan ? Response.json({ source: "fixture", plan }) : null;
  };

  if (!hasApiKey()) {
    return (
      fixture() ?? Response.json({ error: "nothing_to_review" }, { status: 404 })
    );
  }

  try {
    const gen = await callModel(
      "review",
      buildReviewPrompt({
        model: content.model,
        goal: body.goal,
        kind: body.kind,
        learner,
        lastConceptId: body.lastConceptId,
      }),
      ReviewPlanSchema,
    );

    // Guardrails: last-lesson reviews stay on the last concept; broad reviews
    // may only touch taught concepts; MC-only with a valid correct option.
    const taught = new Set(
      Object.entries(learner.conceptStatus)
        .filter(([, status]) => status !== "untaught")
        .map(([id]) => id),
    );
    const conceptIds =
      body.kind === "last_lesson" && body.lastConceptId
        ? [body.lastConceptId]
        : gen.conceptIds.filter((id) => taught.has(id));
    if (conceptIds.length === 0) throw new Error("no_valid_concepts");

    const questions: Question[] = gen.questions
      .filter(
        (q) =>
          q.kind === "mc" &&
          q.options &&
          q.options.length >= 2 &&
          q.options.some((o) => o.id === q.correctOptionId),
      )
      .slice(0, 3)
      .map((q) => ({
        id: q.id,
        kind: "mc" as const,
        prompt: q.prompt,
        options: q.options ?? undefined,
        correctOptionId: q.correctOptionId ?? undefined,
      }));
    if (questions.length === 0) throw new Error("no_valid_questions");

    const plan: ReviewPlan = {
      kind: body.kind,
      conceptIds,
      questions,
      reason: gen.reason,
    };
    return Response.json({ source: "model", plan });
  } catch (err) {
    console.error("review: model path failed, using fixture fallback", err);
    return (
      fixture() ?? Response.json({ error: "nothing_to_review" }, { status: 404 })
    );
  }
}
