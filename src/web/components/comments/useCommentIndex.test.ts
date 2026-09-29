import { describe, expect, test } from "bun:test";
import { parsePatchFiles } from "@pierre/diffs";
import type { FileReviewState, ReviewComment } from "@shared/types";
import {
  buildCommentIndex,
  type CommentIndexSource,
  filterComments,
  stepComment,
} from "./useCommentIndex";

const PATCH = `diff --git a/src/a.ts b/src/a.ts
index 1111111..2222222 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,3 +1,3 @@
 one
-two
+TWO
 three
diff --git a/README.md b/README.md
index 1111111..2222222 100644
--- a/README.md
+++ b/README.md
@@ -1,1 +1,1 @@
-old
+new
`;

const fileDiffs = new Map(parsePatchFiles(PATCH)[0].files.map((f) => [f.name, f]));
const DIFF: CommentIndexSource = { kind: "diff", fileDiffs };

let nextId = 0;
function comment(
  filePath: string,
  line: number | null,
  side: ReviewComment["side"],
  body = "body",
): ReviewComment {
  return { id: `c${nextId++}`, filePath, line, side, body, createdAt: "2026-01-01T00:00:00Z" };
}

function review(...comments: ReviewComment[]): Record<string, FileReviewState> {
  const files: Record<string, FileReviewState> = {};
  for (const c of comments) {
    files[c.filePath] ??= { path: c.filePath, viewed: false, comments: [] };
    files[c.filePath].comments.push(c);
  }
  return files;
}

describe("buildCommentIndex (diff)", () => {
  test("orders files by tree order, then file, orphan and line comments", () => {
    const orphan = comment("src/a.ts", 40, "addition");
    const lineAdd = comment("src/a.ts", 2, "addition");
    const lineDel = comment("src/a.ts", 2, "deletion");
    const first = comment("src/a.ts", 1, "addition");
    const fileLevel = comment("src/a.ts", null, null);
    const readme = comment("README.md", 1, "addition");
    const index = buildCommentIndex(
      review(readme, orphan, lineAdd, lineDel, first, fileLevel),
      DIFF,
    );
    // Folders before files at the same level, as in the file tree.
    expect(index.map((i) => i.comment.id)).toEqual([
      fileLevel.id,
      orphan.id,
      first.id,
      lineDel.id,
      lineAdd.id,
      readme.id,
    ]);
  });

  test("classifies comments and reads the commented line", () => {
    const [fileLevel, orphan, del, add] = buildCommentIndex(
      review(
        comment("src/a.ts", null, null),
        comment("src/a.ts", 2, "deletion"),
        comment("src/a.ts", 2, "addition"),
        comment("src/a.ts", 9, "deletion"),
      ),
      DIFF,
    );
    expect(fileLevel).toMatchObject({ kind: "file", code: null });
    expect(del).toMatchObject({ kind: "line", code: "two" });
    expect(add).toMatchObject({ kind: "line", code: "TWO" });
    expect(orphan).toMatchObject({ kind: "orphan", code: null });
  });

  test("a comment on a file missing from the patch is orphaned", () => {
    const [entry] = buildCommentIndex(review(comment("gone.ts", 1, "addition")), DIFF);
    expect(entry.kind).toBe("orphan");
  });
});

describe("buildCommentIndex (folder)", () => {
  test("reads lines of loaded files and orphans lines past the end", () => {
    const source: CommentIndexSource = {
      kind: "folder",
      files: { "a.md": { status: "loaded", content: "# Title\nbody\n" } },
    };
    const [orphan, line] = buildCommentIndex(
      review(comment("a.md", 2, null), comment("a.md", 3, null)),
      source,
    );
    expect(line).toMatchObject({ kind: "line", code: "body" });
    expect(orphan).toMatchObject({ kind: "orphan", code: null });
  });

  test("a file not loaded yet keeps its comments as line comments without code", () => {
    const [entry] = buildCommentIndex(review(comment("b.ts", 120, null)), {
      kind: "folder",
      files: {},
    });
    expect(entry).toMatchObject({ kind: "line", code: null });
  });
});

describe("filterComments", () => {
  const index = buildCommentIndex(
    review(
      comment("src/a.ts", 1, "addition", "Should come from **Config**"),
      comment("src/a.ts", 2, "addition", "Rename this"),
      comment("README.md", 1, "addition", "Typo"),
    ),
    DIFF,
  );

  test("matches the body case-insensitively, as plain text", () => {
    expect(filterComments(index, "from config").map((i) => i.comment.body)).toEqual([
      "Should come from **Config**",
    ]);
  });

  test("matches the file path", () => {
    expect(filterComments(index, "readme").map((i) => i.comment.body)).toEqual(["Typo"]);
  });

  test("an empty query keeps everything", () => {
    expect(filterComments(index, "  ")).toBe(index);
  });
});

describe("stepComment", () => {
  const all = buildCommentIndex(
    review(
      comment("src/a.ts", 1, "addition", "one"),
      comment("src/a.ts", 2, "addition", "two config"),
      comment("src/a.ts", 3, "addition", "three"),
      comment("README.md", 1, "addition", "four config"),
    ),
    DIFF,
  );
  const ids = all.map((e) => e.comment.id);
  const bodyOf = (entry: ReturnType<typeof stepComment>) => entry?.comment.body ?? null;

  test("with no current comment, n goes to the first and p to the last", () => {
    expect(bodyOf(stepComment(all, all, null, 1))).toBe("one");
    expect(bodyOf(stepComment(all, all, null, -1))).toBe("four config");
  });

  test("moves one step and stops at the ends", () => {
    expect(bodyOf(stepComment(all, all, ids[1], 1))).toBe("three");
    expect(bodyOf(stepComment(all, all, ids[1], -1))).toBe("one");
    expect(stepComment(all, all, ids[3], 1)).toBeNull();
    expect(stepComment(all, all, ids[0], -1)).toBeNull();
  });

  test("walks only the filtered list", () => {
    const visible = filterComments(all, "config");
    expect(bodyOf(stepComment(all, visible, ids[1], 1))).toBe("four config");
  });

  test("a filtered-out current comment counts from its place", () => {
    const visible = filterComments(all, "config");
    expect(bodyOf(stepComment(all, visible, ids[2], 1))).toBe("four config");
    expect(bodyOf(stepComment(all, visible, ids[2], -1))).toBe("two config");
    expect(stepComment(all, visible, ids[0], -1)).toBeNull();
  });
});
