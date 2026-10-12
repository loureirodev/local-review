import { describe, expect, test } from "bun:test";
import type { FileReviewState } from "@shared/types";
import { commentsSignature, pageTitle } from "./pageTitle";

describe("pageTitle", () => {
  test("pending: branch and repository", () => {
    expect(pageTitle({ type: "pending", staged: false }, "local-review", "feat/x", false)).toBe(
      "feat/x · local-review",
    );
  });

  test("branch: branch, base and repository", () => {
    expect(pageTitle({ type: "branch", base: "main" }, "local-review", "feat/x", false)).toBe(
      "feat/x → main · local-review",
    );
  });

  test("folder: folder and the repository it lives in", () => {
    expect(
      pageTitle({ type: "folder", path: "/repo/local-review/docs" }, "local-review", "", false),
    ).toBe("docs · local-review");
  });

  test("folder: repository root or no repository shows the folder alone", () => {
    expect(pageTitle({ type: "folder", path: "/x/local-review/" }, "local-review", "", false)).toBe(
      "local-review",
    );
    expect(pageTitle({ type: "folder", path: "/x/notes" }, undefined, "", false)).toBe("notes");
  });

  test("folder: Windows path", () => {
    expect(
      pageTitle(
        { type: "folder", path: "C:\\work\\local-review\\docs\\" },
        "local-review",
        "",
        false,
      ),
    ).toBe("docs · local-review");
  });
});

describe("pageTitle unsaved mark", () => {
  test("prefixes a dot", () => {
    expect(pageTitle({ type: "pending", staged: false }, "local-review", "main", true)).toBe(
      "• main · local-review",
    );
  });
});

describe("commentsSignature", () => {
  const comment = (id: string, body: string) => ({
    id,
    filePath: "a.ts",
    line: 1,
    side: "addition" as const,
    body,
    createdAt: "",
  });
  const file = (viewed: boolean, ...comments: ReturnType<typeof comment>[]): FileReviewState => ({
    path: "a.ts",
    viewed,
    comments,
  });

  test("ignores order and viewed marks", () => {
    expect(commentsSignature([file(false, comment("1", "x"), comment("2", "y"))])).toBe(
      commentsSignature([file(true, comment("2", "y"), comment("1", "x"))]),
    );
  });

  test("changes when a comment is edited", () => {
    expect(commentsSignature([file(false, comment("1", "x"))])).not.toBe(
      commentsSignature([file(false, comment("1", "z"))]),
    );
  });
});
