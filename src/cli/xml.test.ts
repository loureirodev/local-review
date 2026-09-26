import { describe, expect, test } from "bun:test";
import type { DiffSource, ReviewComment, ReviewState } from "../shared/types";
import { deserializeReview, isLegacyReview } from "./xml-deserializer";
import { serializeReview } from "./xml-serializer";

const SHA = "0123456789abcdef0123456789abcdef01234567";

function review(source: DiffSource, comments: ReviewComment[] = []): ReviewState {
  return {
    timestamp: "2026-09-26T10:00:00.000Z",
    source,
    files: [{ path: "src/a.ts", viewed: true, comments }],
  };
}

function comment(line: number | null, side: ReviewComment["side"]): ReviewComment {
  return {
    id: "c1",
    filePath: "src/a.ts",
    line,
    side,
    body: 'Use <const> & "quotes"',
    createdAt: "2026-09-26T10:00:00.000Z",
  };
}

const roundTrip = (state: ReviewState) => deserializeReview(serializeReview(state));

describe("source round-trip", () => {
  const sources: [string, DiffSource][] = [
    ["branch", { type: "branch", base: "main", head: "feat/x", commit: SHA }],
    ["pending staged", { type: "pending", staged: true, head: "feat/x", commit: SHA }],
    ["pending unstaged", { type: "pending", staged: false }],
    ["folder", { type: "folder", path: "/abs/docs" }],
    [
      "github-pr",
      {
        type: "github-pr",
        owner: "o",
        repo: "r",
        pr: 7,
        base: "main",
        head: "feat/x",
        commit: SHA,
      },
    ],
    ["gitlab-mr", { type: "gitlab-mr", project: "g/p", mr: 3, base: "develop", head: "fix/y" }],
    ["agent", { type: "agent", agent: "claude", head: "feat/x", commit: SHA }],
    ["agent without revision", { type: "agent" }],
  ];

  for (const [name, source] of sources) {
    test(name, () => {
      expect(roundTrip(review(source)).source).toEqual(source);
    });
  }

  test("omits absent revision attributes", () => {
    const xml = serializeReview(review({ type: "branch", base: "main" }));
    expect(xml).toContain('<source type="branch" base="main" />');
  });

  test("defaults a missing <source> to unstaged pending", () => {
    const xml = serializeReview(review({ type: "branch", base: "main" })).replace(
      /\s*<source [^>]*\/>/,
      "",
    );
    expect(deserializeReview(xml).source).toEqual({ type: "pending", staged: false });
  });
});

describe("comment lines", () => {
  test("diff line keeps its side", () => {
    const state = review({ type: "pending", staged: false }, [comment(42, "addition")]);
    expect(roundTrip(state).files[0].comments[0]).toMatchObject({ line: 42, side: "addition" });
  });

  test("folder line is written without side and read back as side null", () => {
    const state = review({ type: "folder", path: "/abs/docs" }, [comment(42, null)]);
    const xml = serializeReview(state);
    expect(xml).toContain('<line number="42" />');
    expect(roundTrip(state).files[0].comments[0]).toEqual(comment(42, null));
  });

  test("file-level comment has no line element", () => {
    const state = review({ type: "folder", path: "/abs/docs" }, [comment(null, null)]);
    expect(serializeReview(state)).not.toContain("<line");
    expect(roundTrip(state).files[0].comments[0]).toEqual(comment(null, null));
  });
});

describe("legacy reviews", () => {
  test("pre-0.4 local sources are detected and read as pending changes", () => {
    const xml = '<review><source type="local" mode="branch" /><files></files></review>';
    expect(isLegacyReview(xml)).toBe(true);
    expect(deserializeReview(xml).source).toEqual({ type: "pending", staged: false });
    expect(isLegacyReview(serializeReview(review({ type: "pending", staged: true })))).toBe(false);
  });
});
