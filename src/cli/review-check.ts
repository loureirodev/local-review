// Deterministic check of an existing review against the current checkout,
// and derivation of the launch mode from the review's source.

import type { DiffSource, LaunchSource } from "../shared/types";
import type { Checkout } from "./git";

export type CheckStatus = "ok" | "branch-mismatch" | "folder-missing" | "no-review";
export type CheckWarning = "commit-mismatch" | "unverified";

export interface CheckResult {
  status: CheckStatus;
  warnings: CheckWarning[];
  /** `worktree`: where `head` is already checked out, when that is another worktree. */
  expected: { head?: string; commit?: string; path?: string; worktree?: string };
  current: Checkout;
  source: DiffSource | null;
}

/** Exit status for `check` and for a blocked launch. */
export const EXIT_BLOCKED = 3;

export function isBlocking(result: CheckResult): boolean {
  return result.status === "branch-mismatch" || result.status === "folder-missing";
}

export function noReviewResult(current: Checkout): CheckResult {
  return { status: "no-review", warnings: [], expected: {}, current, source: null };
}

/** A different branch blocks; a different commit only warns, so reopening after
 *  committing fixes still works. Being on the review's exact commit always passes. */
export function checkRevision(
  source: DiffSource,
  current: Checkout,
  folderExists: boolean,
): CheckResult {
  if (source.type === "folder") {
    return {
      status: folderExists ? "ok" : "folder-missing",
      warnings: [],
      expected: { path: source.path },
      current,
      source,
    };
  }

  const expected = { head: source.head, commit: source.commit };
  const result: CheckResult = { status: "ok", warnings: [], expected, current, source };
  if (!source.head) {
    result.warnings.push("unverified");
    return result;
  }
  const sameCommit = source.commit !== undefined && source.commit === current.commit;
  if (source.head !== current.branch) {
    if (!sameCommit) result.status = "branch-mismatch";
    return result;
  }
  if (source.commit && !sameCommit) result.warnings.push("commit-mismatch");
  return result;
}

const short = (sha?: string) => sha?.slice(0, 7) ?? "?";

function originLabel(source: DiffSource | null): string {
  if (source?.type === "github-pr")
    return ` (GitHub PR #${source.pr}, ${source.owner}/${source.repo})`;
  if (source?.type === "gitlab-mr") return ` (GitLab MR !${source.mr}, ${source.project})`;
  return "";
}

/** Human-readable lines for stderr: the blocking reason first, then warnings. */
export function describeCheck(result: CheckResult, reviewPath: string): string[] {
  const { expected, current } = result;
  const lines: string[] = [];
  switch (result.status) {
    case "no-review":
      lines.push(`No review found at ${reviewPath}`);
      break;
    case "folder-missing":
      lines.push(`The reviewed folder no longer exists: ${expected.path}`);
      break;
    case "branch-mismatch":
      lines.push(
        `This review was made on ${expected.head} (${short(expected.commit)})${originLabel(result.source)}, but you are on ${current.branch ?? "a detached HEAD"} (${short(current.commit)}).`,
        expected.worktree
          ? `Line numbers may not match. ${expected.head} is checked out in ${expected.worktree}; open the review from there.`
          : `Line numbers may not match. To review it on its branch: git switch ${expected.head}`,
      );
      break;
  }
  for (const warning of result.warnings) {
    if (warning === "commit-mismatch") {
      lines.push(
        `Warning: this review was made at ${short(expected.commit)}; ${expected.head} is now at ${short(current.commit)}. Lines may be offset.`,
      );
    } else {
      lines.push("Warning: the review does not record its branch; it could not be verified.");
    }
  }
  return lines;
}

interface DeriveDeps {
  getBaseBranch: () => Promise<string>;
  hasPendingChanges: () => Promise<boolean>;
}

/** The launch mode that shows the code a review was made on. */
export async function deriveLaunchSource(
  source: DiffSource,
  deps: DeriveDeps,
): Promise<LaunchSource> {
  switch (source.type) {
    case "branch":
      return { type: "branch", base: source.base };
    case "pending":
      return { type: "pending", staged: source.staged };
    case "folder":
      return { type: "folder", path: source.path };
    case "github-pr":
    case "gitlab-mr":
      return { type: "branch", base: source.base ?? (await deps.getBaseBranch()) };
    case "agent":
      return (await deps.hasPendingChanges())
        ? { type: "pending", staged: false }
        : { type: "branch", base: await deps.getBaseBranch() };
  }
}
