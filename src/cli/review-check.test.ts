import { describe, expect, test } from "bun:test";
import type { DiffSource } from "../shared/types";
import { checkRevision, deriveLaunchSource, isBlocking } from "./review-check";

const A = "a".repeat(40);
const B = "b".repeat(40);

describe("checkRevision", () => {
  const branch = (head?: string, commit?: string): DiffSource => ({
    type: "branch",
    base: "main",
    head,
    commit,
  });

  test("same branch and commit passes silently", () => {
    const r = checkRevision(branch("feat/x", A), { branch: "feat/x", commit: A }, true);
    expect(r.status).toBe("ok");
    expect(r.warnings).toEqual([]);
  });

  test("same branch, different commit only warns", () => {
    const r = checkRevision(branch("feat/x", A), { branch: "feat/x", commit: B }, true);
    expect(r.status).toBe("ok");
    expect(r.warnings).toEqual(["commit-mismatch"]);
    expect(isBlocking(r)).toBe(false);
  });

  test("same branch without a recorded commit passes", () => {
    const r = checkRevision(branch("feat/x"), { branch: "feat/x", commit: B }, true);
    expect(r).toMatchObject({ status: "ok", warnings: [] });
  });

  test("different branch blocks", () => {
    const r = checkRevision(branch("feat/x", A), { branch: "main", commit: B }, true);
    expect(r.status).toBe("branch-mismatch");
    expect(isBlocking(r)).toBe(true);
  });

  test("detached HEAD on the reviewed commit passes", () => {
    const r = checkRevision(branch("feat/x", A), { commit: A }, true);
    expect(r.status).toBe("ok");
  });

  test("no head recorded is unverified but not blocking", () => {
    const r = checkRevision(branch(undefined, A), { branch: "main", commit: B }, true);
    expect(r).toMatchObject({ status: "ok", warnings: ["unverified"] });
  });

  test("forge sources are checked like the rest", () => {
    const pr: DiffSource = { type: "github-pr", owner: "o", repo: "r", pr: 1, head: "feat/x" };
    expect(checkRevision(pr, { branch: "main" }, true).status).toBe("branch-mismatch");
  });

  test("folder reviews only check the path", () => {
    const folder: DiffSource = { type: "folder", path: "/abs/docs" };
    expect(checkRevision(folder, {}, true).status).toBe("ok");
    expect(checkRevision(folder, {}, false).status).toBe("folder-missing");
  });
});

describe("deriveLaunchSource", () => {
  const deps = (pending: boolean) => ({
    getBaseBranch: async () => "develop",
    hasPendingChanges: async () => pending,
  });

  test("launch sources map to themselves", async () => {
    expect(await deriveLaunchSource({ type: "branch", base: "main" }, deps(false))).toEqual({
      type: "branch",
      base: "main",
    });
    expect(await deriveLaunchSource({ type: "pending", staged: true }, deps(false))).toEqual({
      type: "pending",
      staged: true,
    });
    expect(await deriveLaunchSource({ type: "folder", path: "/d" }, deps(false))).toEqual({
      type: "folder",
      path: "/d",
    });
  });

  test("forge reviews compare against their target branch, or the detected base", async () => {
    const pr: DiffSource = { type: "github-pr", owner: "o", repo: "r", pr: 1, base: "main" };
    expect(await deriveLaunchSource(pr, deps(false))).toEqual({ type: "branch", base: "main" });
    const mr: DiffSource = { type: "gitlab-mr", project: "g/p", mr: 2 };
    expect(await deriveLaunchSource(mr, deps(false))).toEqual({ type: "branch", base: "develop" });
  });

  test("agent reviews open pending changes when there are any", async () => {
    const agent: DiffSource = { type: "agent" };
    expect(await deriveLaunchSource(agent, deps(true))).toEqual({ type: "pending", staged: false });
    expect(await deriveLaunchSource(agent, deps(false))).toEqual({
      type: "branch",
      base: "develop",
    });
  });
});
