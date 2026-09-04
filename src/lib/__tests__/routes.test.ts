import { beforeEach, describe, expect, it, vi } from "vitest";
import { newDemoJourney } from "../engine";
import { getLesson } from "../content";

// Mock the Anthropic boundary — routes must be fully testable without a key.
vi.mock("@/lib/server/anthropic", () => ({
  hasApiKey: vi.fn(() => false),
  getModel: () => "claude-test",
  getEffort: () => "medium",
  getClient: vi.fn(),
  logUsage: vi.fn(),
}));
vi.mock("@/lib/server/model-call", () => ({
  callModel: vi.fn(),
}));

import { hasApiKey } from "@/lib/server/anthropic";
import { callModel } from "@/lib/server/model-call";
import { POST as lessonPOST } from "@/app/api/lesson/route";
import { POST as assessPOST } from "@/app/api/assess/route";
import { POST as reviewPOST } from "@/app/api/review/route";

const mockHasApiKey = vi.mocked(hasApiKey);
const mockCallModel = vi.mocked(callModel);

function post(handler: (req: Request) => Promise<Response>, body: unknown) {
  return handler(
    new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const learner = newDemoJourney(0).learner;
const base = {
  repoId: "express",
  goal: "architecture" as const,
  questionStyle: "mixed" as const,
  learner,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockHasApiKey.mockReturnValue(false);
});

describe("POST /api/lesson", () => {
  it("rejects malformed bodies", async () => {
    const res = await post(lessonPOST, { repoId: "express" });
    expect(res.status).toBe(400);
  });

  it("serves the fixture lesson without an API key", async () => {
    const res = await post(lessonPOST, {
      ...base,
      conceptId: "middleware-pipeline",
    });
    const json = await res.json();
    expect(json.source).toBe("fixture");
    expect(json.lesson.title).toBe("One pipeline, many small steps");
  });

  it("returns 503 for unscripted concepts without a key", async () => {
    const res = await post(lessonPOST, { ...base, conceptId: "error-handling" });
    expect(res.status).toBe(503);
  });

  it("maps a valid model lesson and attaches evidence when requested", async () => {
    mockHasApiKey.mockReturnValue(true);
    mockCallModel.mockResolvedValue({
      title: "Errors take the fast lane",
      kicker: "Level 4 · Architecture",
      paragraphs: ["p1", "p2"],
      useExcerpt: true,
      questions: [
        {
          id: "q1",
          kind: "mc",
          prompt: "?",
          options: [
            { id: "a", label: "right" },
            { id: "b", label: "wrong" },
          ],
          correctOptionId: "a",
        },
      ],
    });
    const res = await post(lessonPOST, { ...base, conceptId: "error-handling" });
    const json = await res.json();
    expect(json.source).toBe("model");
    expect(json.lesson.excerpt.path).toBe("lib/router/layer.js");
    expect(json.lesson.questions).toHaveLength(1);
  });

  it("drops malformed MC questions; falls back when none survive", async () => {
    mockHasApiKey.mockReturnValue(true);
    mockCallModel.mockResolvedValue({
      title: "t",
      kicker: "k",
      paragraphs: ["p"],
      useExcerpt: false,
      questions: [
        {
          id: "q1",
          kind: "mc",
          prompt: "?",
          options: [{ id: "a", label: "only one option" }],
          correctOptionId: "z", // not among options
        },
      ],
    });
    // fixture exists for middleware-pipeline -> falls back there
    const res = await post(lessonPOST, {
      ...base,
      conceptId: "middleware-pipeline",
    });
    const json = await res.json();
    expect(json.source).toBe("fixture");
  });

  it("falls back to fixture when the model call throws (schema rejection)", async () => {
    mockHasApiKey.mockReturnValue(true);
    mockCallModel.mockRejectedValue(new Error("schema_validation_failed"));
    const res = await post(lessonPOST, {
      ...base,
      conceptId: "middleware-pipeline",
    });
    const json = await res.json();
    expect(json.source).toBe("fixture");
  });
});

describe("POST /api/assess", () => {
  const lesson1 = getLesson("express", "middleware-pipeline")!;
  const assessBody = {
    ...base,
    conceptId: "middleware-pipeline",
    lessonTitle: lesson1.title,
    questions: lesson1.questions,
    answers: { "e1-q1": "a", "e1-q2": "a", "e1-q3": "it can modify it" },
  };

  it("runs the scripted branch without a key (remediation on wrong ordering)", async () => {
    const res = await post(assessPOST, assessBody);
    const json = await res.json();
    expect(json.source).toBe("fixture");
    expect(json.outcome.nextConceptId).toBe("router-stack");
    expect(json.outcome.conceptStatus).toBe("misconception");
  });

  it("deterministic MC grading overrides the model; free-form comes from the model", async () => {
    mockHasApiKey.mockReturnValue(true);
    mockCallModel.mockResolvedValue({
      freeFormGrades: [{ questionId: "e1-q3", correct: true, note: null }],
      assessment: {
        mastery: 0.5,
        conceptsDemonstrated: [],
        misconceptions: ["ordering is automatic"],
        missingPoints: [],
        feedback: "f",
        recommendedAction: "remediate",
        confidence: 0.8,
      },
      adaptationMessage: "adapting",
      nextConceptId: "router-stack",
    });
    const res = await post(assessPOST, assessBody);
    const json = await res.json();
    expect(json.source).toBe("model");
    // e1-q2 answered "a" which is wrong — deterministic, regardless of model
    expect(json.outcome.correct["e1-q2"]).toBe(false);
    expect(json.outcome.correct["e1-q1"]).toBe(true);
    expect(json.outcome.correct["e1-q3"]).toBe(true);
    expect(json.outcome.conceptStatus).toBe("misconception");
  });

  it("replaces an invalid nextConceptId with the deterministic choice", async () => {
    mockHasApiKey.mockReturnValue(true);
    mockCallModel.mockResolvedValue({
      freeFormGrades: [{ questionId: "e1-q3", correct: true, note: null }],
      assessment: {
        mastery: 0.9,
        conceptsDemonstrated: [],
        misconceptions: [],
        missingPoints: [],
        feedback: "f",
        recommendedAction: "advance",
        confidence: 0.8,
      },
      adaptationMessage: "adapting",
      nextConceptId: "not-a-real-concept",
    });
    const res = await post(assessPOST, assessBody);
    const json = await res.json();
    // first untaught in-scope concept after middleware-pipeline
    expect(json.outcome.nextConceptId).toBe("routing-layer");
  });

  it("falls back to the fixture outcome when the model call fails", async () => {
    mockHasApiKey.mockReturnValue(true);
    mockCallModel.mockRejectedValue(new Error("boom"));
    const res = await post(assessPOST, assessBody);
    const json = await res.json();
    expect(json.source).toBe("fixture");
    expect(json.outcome.nextConceptId).toBe("router-stack");
  });
});

describe("POST /api/review", () => {
  const taughtLearner = {
    ...learner,
    conceptStatus: { "middleware-pipeline": "understood" },
    mastery: {
      "middleware-pipeline": { score: 0.6, confidence: 0.5, lastTestedAt: 1 },
    },
  };

  it("serves the fixture review plan without a key", async () => {
    const res = await post(reviewPOST, {
      ...base,
      learner: taughtLearner,
      kind: "last_lesson",
      lastConceptId: "middleware-pipeline",
    });
    const json = await res.json();
    expect(json.source).toBe("fixture");
    expect(json.plan.conceptIds).toEqual(["middleware-pipeline"]);
  });

  it("filters model-chosen concepts down to taught ones", async () => {
    mockHasApiKey.mockReturnValue(true);
    mockCallModel.mockResolvedValue({
      conceptIds: ["middleware-pipeline", "vs-alternatives"], // latter untaught
      reason: "because",
      questions: [
        {
          id: "q1",
          kind: "mc",
          prompt: "?",
          options: [
            { id: "a", label: "x" },
            { id: "b", label: "y" },
          ],
          correctOptionId: "a",
        },
      ],
    });
    const res = await post(reviewPOST, {
      ...base,
      learner: taughtLearner,
      kind: "broad",
      lastConceptId: "middleware-pipeline",
    });
    const json = await res.json();
    expect(json.source).toBe("model");
    expect(json.plan.conceptIds).toEqual(["middleware-pipeline"]);
  });
});
