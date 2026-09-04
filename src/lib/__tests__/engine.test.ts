import { describe, expect, it } from "vitest";
import { getLesson } from "../content";
import {
  newDemoJourney,
  planReview,
  seedFastapiJourney,
  submitLesson,
  submitReview,
} from "../engine";

const NOW = 1_700_000_000_000;

const lesson1 = getLesson("express", "middleware-pipeline")!;

const allCorrect = { "e1-q1": "a", "e1-q2": "b", "e1-q3": "it can modify or respond" };
const orderingWrong = { "e1-q1": "a", "e1-q2": "a", "e1-q3": "it can modify" };

describe("submitLesson — the demo branch", () => {
  it("advances to routing-layer when everything is right", () => {
    const { journey, step } = submitLesson(newDemoJourney(NOW), lesson1, allCorrect, NOW);
    expect(step.nextConceptId).toBe("routing-layer");
    expect(journey.learner.conceptStatus["middleware-pipeline"]).toBe("understood");
    expect(journey.learner.recommendedNext?.action).toBe("advance");
  });

  it("remediates to router-stack when ordering is wrong", () => {
    const { journey, step } = submitLesson(newDemoJourney(NOW), lesson1, orderingWrong, NOW);
    expect(step.nextConceptId).toBe("router-stack");
    expect(journey.learner.conceptStatus["middleware-pipeline"]).toBe("misconception");
    expect(journey.learner.recommendedNext?.action).toBe("remediate");
    expect(step.assessment.misconceptions.length).toBeGreaterThan(0);
  });

  it("records the step with per-question correctness", () => {
    const { journey } = submitLesson(newDemoJourney(NOW), lesson1, orderingWrong, NOW);
    expect(journey.steps).toHaveLength(1);
    expect(journey.steps[0].correct["e1-q2"]).toBe(false);
    expect(journey.steps[0].correct["e1-q1"]).toBe(true);
  });
});

describe("planReview", () => {
  it("targets the last taught concept for last-lesson review", () => {
    const { journey } = submitLesson(newDemoJourney(NOW), lesson1, allCorrect, NOW);
    const plan = planReview(journey, "last_lesson");
    expect(plan?.conceptIds).toEqual(["middleware-pipeline"]);
    expect(plan!.questions.length).toBeGreaterThan(0);
    expect(plan!.questions.length).toBeLessThanOrEqual(3);
  });

  it("samples weakest/stalest concepts for broad review", () => {
    const journey = seedFastapiJourney(NOW);
    const plan = planReview(journey, "broad");
    // pydantic (0.55) and async (0.6) are the weakest with bank questions
    expect(plan?.conceptIds).toEqual(["pydantic-validation", "async-endpoints"]);
  });

  it("falls back to lesson questions when a concept has no review bank", () => {
    const journey = seedFastapiJourney(NOW);
    // last-lesson concept is dependency-injection (recommendedNext, no steps yet)
    const plan = planReview(journey, "last_lesson");
    expect(plan?.conceptIds).toEqual(["dependency-injection"]);
    expect(plan!.questions.length).toBeGreaterThan(0);
  });
});

describe("submitReview", () => {
  it("promotes taught_untested to understood on a correct answer", () => {
    const journey = seedFastapiJourney(NOW);
    const plan = planReview(journey, "last_lesson")!;
    const answers = Object.fromEntries(
      plan.questions.map((q) => [q.id, q.correctOptionId ?? "x"]),
    );
    const { journey: updated } = submitReview(journey, plan, answers, NOW);
    expect(updated.learner.conceptStatus["dependency-injection"]).toBe("understood");
  });

  it("marks a wrong concept partial and redirects the path to reinforce it", () => {
    const journey = seedFastapiJourney(NOW);
    const plan = planReview(journey, "broad")!;
    const answers = Object.fromEntries(plan.questions.map((q) => [q.id, "zzz"]));
    const { journey: updated, review } = submitReview(journey, plan, answers, NOW);
    expect(updated.learner.conceptStatus["pydantic-validation"]).toBe("partial");
    expect(updated.learner.recommendedNext?.action).toBe("reinforce");
    expect(review.correct[plan.questions[0].id]).toBe(false);
  });

  it("does not change coverage-relevant status when review is correct on understood concepts", () => {
    const journey = seedFastapiJourney(NOW);
    const plan = planReview(journey, "broad")!;
    const answers = Object.fromEntries(
      plan.questions.map((q) => [q.id, q.correctOptionId ?? "x"]),
    );
    const { journey: updated } = submitReview(journey, plan, answers, NOW);
    expect(updated.learner.conceptStatus["pydantic-validation"]).toBe("understood");
    expect(updated.learner.mastery["pydantic-validation"].score).toBeGreaterThan(0.55);
  });
});
