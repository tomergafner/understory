import { describe, expect, it } from "vitest";
import { gradeFreeFixture, gradeMc } from "../grading";
import type { Question } from "../types";

const mc: Question = {
  id: "q",
  kind: "mc",
  prompt: "p",
  options: [
    { id: "a", label: "right" },
    { id: "b", label: "wrong" },
  ],
  correctOptionId: "a",
};

describe("gradeMc", () => {
  it("accepts the correct option", () => {
    expect(gradeMc(mc, "a")).toBe(true);
  });
  it("rejects a wrong option and empty answers", () => {
    expect(gradeMc(mc, "b")).toBe(false);
    expect(gradeMc(mc, "")).toBe(false);
  });
});

describe("gradeFreeFixture", () => {
  const free: Question = {
    id: "q2",
    kind: "free",
    prompt: "p",
    expectedKeywords: ["modify", "respond"],
  };

  it("accepts an answer containing an expected keyword, case-insensitively", () => {
    expect(gradeFreeFixture(free, "It can MODIFY the request")).toBe(true);
  });
  it("rejects an answer with no expected keyword", () => {
    expect(gradeFreeFixture(free, "it waits quietly")).toBe(false);
  });
  it("falls back to non-empty check when no keywords given", () => {
    const open: Question = { id: "q3", kind: "free", prompt: "p" };
    expect(gradeFreeFixture(open, "anything")).toBe(true);
    expect(gradeFreeFixture(open, "   ")).toBe(false);
  });
});
