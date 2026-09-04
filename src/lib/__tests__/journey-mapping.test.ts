import { describe, expect, it } from "vitest";
import { getLesson } from "../content";
import { newDemoJourney, seedFastapiJourney, submitLesson } from "../engine";
import {
  assembleJourney,
  journeyToRow,
} from "../server/journey-mapping";

const NOW = 1_700_000_000_000;

describe("journey row mapping", () => {
  it("round-trips a journey with steps through rows losslessly", () => {
    const lesson1 = getLesson("express", "middleware-pipeline")!;
    const { journey } = submitLesson(
      newDemoJourney(NOW),
      lesson1,
      lesson1.questions,
      { "e1-q1": "a", "e1-q2": "a", "e1-q3": "modify it" },
      NOW,
    );

    const row = journeyToRow(journey);
    const restored = assembleJourney(
      row,
      journey.steps.map((s) => JSON.parse(JSON.stringify(s))),
      journey.reviews.map((r) => JSON.parse(JSON.stringify(r))),
    );

    expect(restored).toEqual(journey);
  });

  it("round-trips the seeded journey (no steps, rich learner state)", () => {
    const journey = seedFastapiJourney(NOW);
    const restored = assembleJourney(
      JSON.parse(JSON.stringify(journeyToRow(journey))),
      [],
      [],
    );
    expect(restored).toEqual(journey);
  });

  // Regression: the model column was silently dropped by the mapping layer,
  // which white-screened the app after reloading a live-repo journey.
  it("round-trips a live journey WITH its RepositoryModel", async () => {
    const { newLiveJourney } = await import("../engine");
    const { expressModel } = await import("../fixtures/express");
    const liveModel = { ...expressModel, id: "gh:owner/repo", partial: true };
    const journey = newLiveJourney(liveModel, "mixed", NOW);

    const restored = assembleJourney(
      JSON.parse(JSON.stringify(journeyToRow(journey))),
      [],
      [],
    );
    expect(restored.model).toBeDefined();
    expect(restored.model!.concepts.length).toBe(liveModel.concepts.length);
    expect(restored).toEqual(journey);
  });
});
