import { describe, expect, test } from "bun:test";
import { parsePatchFiles } from "@pierre/diffs";
import { getLineText } from "./diffParsing";

const PATCH = `diff --git a/a.ts b/a.ts
index 1111111..2222222 100644
--- a/a.ts
+++ b/a.ts
@@ -1,3 +1,4 @@
 one
-two
+TWO
+two and a half
 three
@@ -10,2 +11,2 @@
 ten
-eleven
+ELEVEN
`;

const fileDiff = parsePatchFiles(PATCH)[0].files[0];

describe("getLineText", () => {
  test("reads context lines on either side", () => {
    expect(getLineText(fileDiff, "additions", 1)).toBe("one");
    expect(getLineText(fileDiff, "deletions", 1)).toBe("one");
    expect(getLineText(fileDiff, "additions", 4)).toBe("three");
    expect(getLineText(fileDiff, "deletions", 3)).toBe("three");
  });

  test("reads changed lines on their own side", () => {
    expect(getLineText(fileDiff, "deletions", 2)).toBe("two");
    expect(getLineText(fileDiff, "additions", 2)).toBe("TWO");
    expect(getLineText(fileDiff, "additions", 3)).toBe("two and a half");
  });

  test("reads lines in a later hunk", () => {
    expect(getLineText(fileDiff, "additions", 11)).toBe("ten");
    expect(getLineText(fileDiff, "deletions", 11)).toBe("eleven");
    expect(getLineText(fileDiff, "additions", 12)).toBe("ELEVEN");
  });

  test("returns null outside the hunks", () => {
    expect(getLineText(fileDiff, "additions", 7)).toBeNull();
    expect(getLineText(fileDiff, "deletions", 40)).toBeNull();
  });
});
