import { getLesson, getRepoContent } from "@/lib/content";
import { hasApiKey } from "@/lib/server/anthropic";
import { callModel } from "@/lib/server/model-call";
import { buildLessonPrompt } from "@/lib/server/prompts";
import {
  GeneratedLessonSchema,
  LessonRequestSchema,
} from "@/lib/server/schemas";
import type { LearnerState, Lesson, Question } from "@/lib/types";

export async function POST(req: Request) {
  let body;
  try {
    body = LessonRequestSchema.parse(await req.json());
    getRepoContent(body.repoId); // throws for unknown repos
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const fixture = () => {
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
        repoId: body.repoId,
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

    const { evidence } = getRepoContent(body.repoId);
    const lesson: Lesson = {
      conceptId: body.conceptId,
      title: gen.title,
      kicker: gen.kicker,
      paragraphs: gen.paragraphs,
      excerpt: gen.useExcerpt ? evidence[body.conceptId] : undefined,
      questions,
    };
    return Response.json({ source: "model", lesson });
  } catch (err) {
    console.error("lesson: model path failed, using fixture fallback", err);
    return (
      fixture() ?? Response.json({ error: "model_error" }, { status: 502 })
    );
  }
}
