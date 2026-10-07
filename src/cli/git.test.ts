import { describe, expect, test } from "bun:test";
import { parseWorktreeList, repoNameFromCommonDir } from "./git";

describe("parseWorktreeList", () => {
  test("maps each branch to its worktree, skipping detached and bare ones", () => {
    const porcelain = [
      "worktree /repo",
      "HEAD aaaa",
      "branch refs/heads/main",
      "",
      "worktree /repo-feat",
      "HEAD bbbb",
      "branch refs/heads/feat/x",
      "",
      "worktree /repo-detached",
      "HEAD cccc",
      "detached",
      "",
      "worktree /repo.git",
      "bare",
    ].join("\n");
    expect(parseWorktreeList(porcelain)).toEqual(
      new Map([
        ["main", "/repo"],
        ["feat/x", "/repo-feat"],
      ]),
    );
  });

  test("handles paths with spaces", () => {
    const porcelain = "worktree /home/me/my repo\nHEAD aaaa\nbranch refs/heads/main";
    expect(parseWorktreeList(porcelain).get("main")).toBe("/home/me/my repo");
  });
});

describe("repoNameFromCommonDir", () => {
  test("names the repository the .git dir belongs to", () => {
    expect(repoNameFromCommonDir("/home/me/local-review/.git")).toBe("local-review");
  });

  test("strips the .git suffix of a bare repository", () => {
    expect(repoNameFromCommonDir("/srv/local-review.git")).toBe("local-review");
    expect(repoNameFromCommonDir("/srv/local-review.git/")).toBe("local-review");
  });
});
