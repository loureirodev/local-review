import { describe, expect, test } from "bun:test";
import type { ReviewWalkthrough } from "@shared/types";
import { initialState, type ReviewStateLocal, reviewReducer } from "./ReviewContext";

function withFiles(viewed: Record<string, boolean>): ReviewStateLocal {
  return {
    ...initialState,
    files: Object.fromEntries(
      Object.entries(viewed).map(([path, v]) => [path, { path, viewed: v, comments: [] }]),
    ),
  };
}

const viewedOf = (state: ReviewStateLocal) =>
  Object.fromEntries(Object.values(state.files).map((f) => [f.path, f.viewed]));

describe("SET_VIEWED", () => {
  const mixed = withFiles({ a: true, b: false, c: false, d: true });

  test("marks every listed file viewed, whatever its state", () => {
    const next = reviewReducer(mixed, { type: "SET_VIEWED", paths: ["a", "b", "c"], viewed: true });
    expect(viewedOf(next)).toEqual({ a: true, b: true, c: true, d: true });
  });

  test("marks every listed file not viewed and leaves the rest", () => {
    const next = reviewReducer(mixed, { type: "SET_VIEWED", paths: ["a", "b"], viewed: false });
    expect(viewedOf(next)).toEqual({ a: false, b: false, c: false, d: true });
  });

  test("ignores paths that are not review files", () => {
    const next = reviewReducer(mixed, { type: "SET_VIEWED", paths: ["zzz"], viewed: true });
    expect(viewedOf(next)).toEqual(viewedOf(mixed));
  });
});

test("LOAD_REVIEW keeps the walkthrough", () => {
  const walkthrough: ReviewWalkthrough = { intent: "Why", steps: [] };
  const next = reviewReducer(initialState, {
    type: "LOAD_REVIEW",
    reviewState: { timestamp: "t", source: { type: "agent" }, walkthrough, files: [] },
  });
  expect(next.walkthrough).toBe(walkthrough);
});
