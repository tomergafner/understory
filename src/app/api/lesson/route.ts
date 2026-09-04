import { getLesson } from "@/lib/content";
import { hasApiKey } from "@/lib/server/anthropic";
import { resolveContent } from "@/lib/server/content-resolver";
import { callModel } from "@/lib/server/model-call";
import { buildLessonPrompt } from "@/lib/server/prompts";
import {
  GeneratedLessonSchema,
  LessonRequestSchema,
} from "@/lib/server/schemas";
import type { LearnerState, Lesson, Question, RepositoryModel } from "@/lib/types";

export async function POST(req: Request) {
  const parsed = LessonRequestSchema.safeParse(
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

  const fixture = () => {
    if (!content.isFixture) return null;
    const lesson = getLesson(body.repoId, body.conceptId);
    return lesson ? Response.json({ source: "fixture", lesson }) : null;
  };

  if (!hasApiKey()) {
    return (
      fixture() ??
      Response.json(
        {
          error: "no_content",
          message:
            "No scripted lesson exists for this concept and no model is configured.",
        },
        { status: 503 },
      )
    );
  }

  try {
    const gen = await callModel(
      "lesson",
      buildLessonPrompt({
        model: content.model,
        evidence: content.evidence,
        conceptId: body.conceptId,
        goal: body.goal,
        questionStyle: body.questionStyle,
        learner: body.learner as LearnerState,
        recentAdaptation: body.recentAdaptation,
      }),
      GeneratedLessonSchema,
    );

    // Deterministic guardrails: only well-formed questions become state.
    const questions: Question[] = gen.questions
      .filter(
        (q) =>
          q.kind === "free" ||
          (q.options &&
            q.options.length >= 2 &&
            q.options.some((o) => o.id === q.correctOptionId)),
      )
      .slice(0, 3)
      .map((q) => ({
        id: q.id,
        kind: q.kind,
        prompt: q.prompt,
        options: q.options ?? undefined,
        correctOptionId: q.correctOptionId ?? undefined,
      }));
    if (questions.length === 0) throw new Error("no_valid_questions");

    const lesson: Lesson = {
      conceptId: body.conceptId,
      title: gen.title,
      kicker: gen.kicker,
      paragraphs: gen.paragraphs,
      excerpt: gen.useExcerpt ? content.evidence[body.conceptId] : undefined,
      questions,
    };
    return Response.json({ source: "model", lesson });
  } catch (err) {
    console.error("lesson: model path failed", err);
    return (
      fixture() ?? Response.json({ error: "model_error" }, { status: 502 })
    );
  }
}
