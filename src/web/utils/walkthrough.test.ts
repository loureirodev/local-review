import { describe, expect, test } from "bun:test";
import type { ReviewWalkthrough } from "@shared/types";
import {
  entryOf,
  focusForPath,
  focusPaths,
  nextEntry,
  type ResolvedWalkthrough,
  readingOrder,
  resolveWalkthrough,
} from "./walkthrough";

const DIFF = ["src/core/a.ts", "src/core/b.ts", "src/ui/c.tsx", "README.md", "bun.lock"];

const WALKTHROUGH: ReviewWalkthrough = {
  intent: "Why",
  steps: [
    {
      title: "Core",
      verify: "Check",
      files: [{ path: "src/core/b.ts", role: "Parser" }, { path: "src/core/a.ts" }],
    },
    { title: "Gone", files: [{ path: "src/removed.ts" }] },
    { title: "UI", files: [{ path: "src/ui/c.tsx", role: "View" }] },
  ],
};

describe("resolveWalkthrough", () => {
  const resolved = resolveWalkthrough(WALKTHROUGH, DIFF);

  test("drops paths missing from the diff and steps left empty", () => {
    expect(resolved.steps.map((s) => s.title)).toEqual(["Core", "UI"]);
  });

  test("keeps walkthrough order within a step", () => {
    expect(resolved.steps[0].files.map((f) => f.path)).toEqual(["src/core/b.ts", "src/core/a.ts"]);
  });

  test("puts the remaining diff files in Other changes, in diff order", () => {
    expect(resolved.other).toEqual(["README.md", "bun.lock"]);
  });

  test("steps keep their written index as id", () => {
    expect(resolved.steps.map((s) => s.id)).toEqual([0, 2]);
  });

  test("has no Other changes when every file is in a step", () => {
    const all = resolveWalkthrough(
      { intent: "", steps: [{ title: "All", files: DIFF.map((path) => ({ path })) }] },
      DIFF,
    );
    expect(all.other).toEqual([]);
  });

  test("collects roles", () => {
    expect(resolved.roles.get("src/core/b.ts")).toBe("Parser");
    expect(resolved.roles.has("src/core/a.ts")).toBe(false);
  });
});

describe("focus", () => {
  const resolved = resolveWalkthrough(WALKTHROUGH, DIFF);

  test("paths per entry", () => {
    expect(focusPaths(resolved, { kind: "all" })).toBeNull();
    expect(focusPaths(null, { kind: "intent" })).toBeNull();
    expect(focusPaths(resolved, { kind: "intent" })).toEqual([]);
    expect(readingOrder(resolved)).toEqual([
      "src/core/b.ts",
      "src/core/a.ts",
      "src/ui/c.tsx",
      "README.md",
      "bun.lock",
    ]);
    expect(focusPaths(resolved, { kind: "step", id: 2 })).toEqual(["src/ui/c.tsx"]);
    expect(focusPaths(resolved, { kind: "step", id: 1 })).toBeNull();
    expect(focusPaths({ ...resolved, other: [] }, { kind: "other" })).toBeNull();
    expect(focusPaths(resolved, { kind: "other" })).toEqual(["README.md", "bun.lock"]);
  });

  test("a step keeps its id when a reload drops an earlier one", () => {
    const reloaded = resolveWalkthrough(WALKTHROUGH, ["src/ui/c.tsx", "README.md"]);
    expect(focusPaths(reloaded, { kind: "step", id: 2 })).toEqual(["src/ui/c.tsx"]);
    expect(focusPaths(reloaded, { kind: "step", id: 0 })).toBeNull();
  });

  test("entry holding a file", () => {
    expect(entryOf(resolved, "src/ui/c.tsx")).toEqual({ kind: "step", id: 2 });
    expect(entryOf(resolved, "bun.lock")).toEqual({ kind: "other" });
  });

  test("navigation keeps the focus when it shows the file", () => {
    const step = { kind: "step", id: 0 } as const;
    expect(focusForPath(resolved, step, "src/core/a.ts")).toBe(step);
    expect(focusForPath(resolved, { kind: "all" }, "bun.lock")).toEqual({ kind: "all" });
  });

  test("navigation switches to the entry holding the file", () => {
    const step = { kind: "step", id: 0 } as const;
    expect(focusForPath(resolved, step, "src/ui/c.tsx")).toEqual({ kind: "step", id: 2 });
    expect(focusForPath(resolved, step, "README.md")).toEqual({ kind: "other" });
    // The intent shows no files: any file leaves it.
    expect(focusForPath(resolved, { kind: "intent" }, "bun.lock")).toEqual({ kind: "other" });
  });

  test("next entry", () => {
    expect(nextEntry(resolved, { kind: "step", id: 0 })).toEqual({ kind: "step", id: 2 });
    expect(nextEntry(resolved, { kind: "step", id: 2 })).toEqual({ kind: "other" });
    expect(nextEntry(resolved, { kind: "other" })).toBeNull();
    expect(nextEntry(resolved, { kind: "intent" })).toEqual({ kind: "step", id: 0 });
    const noOther: ResolvedWalkthrough = { ...resolved, other: [] };
    expect(nextEntry(noOther, { kind: "step", id: 2 })).toBeNull();
  });
});
