import { describe, expect, it } from "vitest";

// Real Anthropic API smoke — excluded from normal runs (CLAUDE.md §17).
// Run with: RUN_REAL_API=1 ANTHROPIC_API_KEY=... npx vitest run src/lib/__tests__/real-api.smoke.test.ts
const enabled = process.env.RUN_REAL_API === "1" && !!process.env.ANTHROPIC_API_KEY;

describe.skipIf(!enabled)("real API smoke", () => {
  it(
    "generates a schema-valid lesson for an unscripted concept",
    { timeout: 120_000 },
    async () => {
      const { callModel } = await import("@/lib/server/model-call");
      const { GeneratedLessonSchema } = await import("@/lib/server/schemas");
      const { buildLessonPrompt } = await import("@/lib/server/prompts");
      const { newDemoJourney } = await import("@/lib/engine");
      const { getRepoContent } = await import("@/lib/content");

      const { model, evidence } = getRepoContent("express");
      const lesson = await callModel(
        "smoke",
        buildLessonPrompt({
          model,
          evidence,
          conceptId: "error-handling",
          goal: "architecture",
          questionStyle: "mixed",
          learner: newDemoJourney(0).learner,
        }),
        GeneratedLessonSchema,
      );

      expect(lesson.paragraphs.length).toBeGreaterThan(0);
      expect(lesson.questions.length).toBeGreaterThan(0);
      expect(lesson.questions.length).toBeLessThanOrEqual(3);
    },
  );
});
