import { describe, expect, it } from "vitest";
import { computeCoverage } from "../coverage";
import { expressModel } from "../fixtures/express";
import { seedFastapiJourney } from "../engine";
import { fastapiModel } from "../fixtures/fastapi";
import type { LearnerState } from "../types";

const emptyLearner: LearnerState = {
  conceptStatus: {},
  mastery: {},
  recommendedNext: null,
};

describe("computeCoverage", () => {
  it("is 0% for a fresh journey", () => {
    const result = computeCoverage(expressModel, "architecture", emptyLearner);
    expect(result.percent).toBe(0);
  });

  it("excludes concepts outside the goal from scope", () => {
    const result = computeCoverage(expressModel, "architecture", emptyLearner);
    expect(result.inScopeConceptIds).not.toContain("router-stack");
  });

  it("credits taught-and-assessed at full weight (2/18 ≈ 11%)", () => {
    const learner: LearnerState = {
      ...emptyLearner,
      conceptStatus: { "middleware-pipeline": "understood" },
    };
    expect(computeCoverage(expressModel, "architecture", learner).percent).toBe(11);
  });

  it("credits taught-but-untested at half weight", () => {
    const learner: LearnerState = {
      ...emptyLearner,
      conceptStatus: { "middleware-pipeline": "taught_untested" },
    };
    expect(computeCoverage(expressModel, "architecture", learner).percent).toBe(6);
  });

  it("counts misconception as traversed — coverage is not mastery", () => {
    const learner: LearnerState = {
      ...emptyLearner,
      conceptStatus: { "middleware-pipeline": "misconception" },
    };
    // router-stack not yet recommended/taught, so denominator is still 18
    expect(computeCoverage(expressModel, "architecture", learner).percent).toBe(11);
  });

  it("grows the denominator when remediation pulls a concept into scope", () => {
    const learner: LearnerState = {
      ...emptyLearner,
      conceptStatus: { "middleware-pipeline": "misconception" },
      recommendedNext: {
        action: "remediate",
        conceptId: "router-stack",
        reason: "test",
      },
    };
    const result = computeCoverage(expressModel, "architecture", learner);
    expect(result.inScopeConceptIds).toContain("router-stack");
    expect(result.addedByAdaptation).toEqual(["router-stack"]);
    expect(result.percent).toBe(10); // 2/20 instead of 2/18
  });

  it("computes the seeded fastapi journey in the low 60s", () => {
    const journey = seedFastapiJourney(1_000_000_000_000);
    const result = computeCoverage(fastapiModel, journey.goal, journey.learner);
    expect(result.percent).toBe(64); // 13.5 / 21
  });
});
