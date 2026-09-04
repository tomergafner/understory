import { describe, expect, it } from "vitest";
import { mergeDeepModel } from "../content";
import type { LearnerState, RepositoryModel } from "../types";

const starter: RepositoryModel = {
  id: "gh:o/r",
  repoUrl: "https://github.com/o/r",
  owner: "o",
  name: "r",
  commitLabel: "abc1234",
  description: "starter",
  languages: ["ts"],
  partial: true,
  concepts: [
    { id: "intro", title: "Intro", summary: "s", level: 1, weight: 2, goals: ["understand"], prerequisites: [] },
    { id: "usage", title: "Usage", summary: "s", level: 2, weight: 2, goals: ["use"], prerequisites: ["intro"] },
    { id: "config", title: "Config", summary: "s", level: 3, weight: 2, goals: ["use"], prerequisites: ["usage"] },
  ],
};

const deep: RepositoryModel = {
  ...starter,
  partial: undefined,
  description: "deep",
  concepts: [
    { id: "intro", title: "Intro refined", summary: "s2", level: 1, weight: 2, goals: ["understand"], prerequisites: [] },
    { id: "architecture", title: "Architecture", summary: "s", level: 4, weight: 3, goals: ["architecture"], prerequisites: ["intro"] },
  ],
};

function learner(partial: Partial<LearnerState>): LearnerState {
  return { conceptStatus: {}, mastery: {}, recommendedNext: null, ...partial };
}

describe("mergeDeepModel", () => {
  it("deep concepts win; untouched starter concepts are dropped; partial cleared", () => {
    const merged = mergeDeepModel(
      { model: starter, learner: learner({}) },
      deep,
    );
    expect(merged.partial).toBeUndefined();
    expect(merged.concepts.map((c) => c.id)).toEqual(["intro", "architecture"]);
    expect(merged.concepts[0].title).toBe("Intro refined");
  });

  it("keeps touched starter concepts the deep model dropped", () => {
    const merged = mergeDeepModel(
      {
        model: starter,
        learner: learner({ conceptStatus: { usage: "understood" } }),
      },
      deep,
    );
    expect(merged.concepts.map((c) => c.id)).toContain("usage");
  });

  it("keeps the recommendedNext concept even when untaught (Continue must not dangle)", () => {
    const merged = mergeDeepModel(
      {
        model: starter,
        learner: learner({
          recommendedNext: {
            action: "advance",
            conceptId: "config",
            reason: "test",
          },
        }),
      },
      deep,
    );
    expect(merged.concepts.map((c) => c.id)).toContain("config");
  });

  it("produces no duplicate ids when deep kept a starter id", () => {
    const merged = mergeDeepModel(
      {
        model: starter,
        learner: learner({ conceptStatus: { intro: "understood" } }),
      },
      deep,
    );
    const ids = merged.concepts.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
