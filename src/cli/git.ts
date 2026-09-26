// Git operations using Bun.spawn

import type { DiffSource } from "../shared/types";

/** Run a shell command and return its stdout. */
async function run(cmd: string[], cwd?: string, allowedExitCodes: number[] = [0]): Promise<string> {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  if (!allowedExitCodes.includes(exitCode)) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Command failed: ${cmd.join(" ")}\n${stderr}`);
  }
  return stdout.trim();
}

async function getUntrackedPatch(cwd?: string): Promise<string> {
  const output = await run(["git", "ls-files", "--others", "--exclude-standard"], cwd);
  if (!output) return "";

  const files = output.split("\n").filter(Boolean);
  const patches = await Promise.all(
    files.map((filePath) =>
      run(["git", "diff", "--no-index", "--", "/dev/null", filePath], cwd, [0, 1]),
    ),
  );
  return patches.filter(Boolean).join("\n");
}

/** Check if we're inside a git repository. */
export async function isGitRepo(cwd?: string): Promise<boolean> {
  try {
    await run(["git", "rev-parse", "--git-dir"], cwd);
    return true;
  } catch {
    return false;
  }
}

/** Get the repository root path. */
export async function getRepoRoot(cwd?: string): Promise<string> {
  return run(["git", "rev-parse", "--show-toplevel"], cwd);
}

/** Get current branch name. */
export async function getCurrentBranch(cwd?: string): Promise<string> {
  try {
    return await run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd);
  } catch {
    // No commits yet
    return "(no commits)";
  }
}

/** Detect the base branch (main, master, or develop). */
export async function getBaseBranch(cwd?: string): Promise<string> {
  const candidates = ["main", "master", "develop"];
  for (const branch of candidates) {
    try {
      await run(["git", "rev-parse", "--verify", branch], cwd);
      return branch;
    } catch {
      // Branch doesn't exist, try next
    }
  }
  // Fallback: try to get the default branch from remote
  try {
    const remoteHead = await run(
      ["git", "symbolic-ref", "refs/remotes/origin/HEAD", "--short"],
      cwd,
    );
    return remoteHead.replace("origin/", "");
  } catch {
    return "main"; // Ultimate fallback
  }
}

/** SHA of `HEAD`, or undefined when the repository has no commits yet. */
export async function getHeadCommit(cwd?: string): Promise<string | undefined> {
  try {
    return await run(["git", "rev-parse", "HEAD"], cwd);
  } catch {
    return undefined;
  }
}

/** Checked-out branch and `HEAD` commit, each absent when git can't tell
 *  (detached `HEAD`, no commits yet, not a repository). */
export interface Checkout {
  branch?: string;
  commit?: string;
}

export async function getCheckout(cwd?: string): Promise<Checkout> {
  const [branch, commit] = await Promise.all([
    // `symbolic-ref -q` fails on a detached `HEAD` instead of printing "HEAD".
    run(["git", "symbolic-ref", "--short", "-q", "HEAD"], cwd).catch(() => undefined),
    getHeadCommit(cwd),
  ]);
  return { branch: branch || undefined, commit };
}

/** Branch → worktree path, from `git worktree list --porcelain`. Detached and
 *  bare worktrees have no branch and are left out. */
export function parseWorktreeList(porcelain: string): Map<string, string> {
  const worktrees = new Map<string, string>();
  for (const block of porcelain.split(/\n\s*\n/)) {
    const path = block.match(/^worktree (.+)$/m)?.[1];
    const branch = block.match(/^branch refs\/heads\/(.+)$/m)?.[1];
    if (path && branch) worktrees.set(branch, path);
  }
  return worktrees;
}

export async function findWorktree(branch: string, cwd?: string): Promise<string | undefined> {
  try {
    return parseWorktreeList(await run(["git", "worktree", "list", "--porcelain"], cwd)).get(
      branch,
    );
  } catch {
    return undefined;
  }
}

/** Run git diff for a branch or pending source and return raw patch text. */
export async function getGitDiff(
  source: Extract<DiffSource, { type: "branch" | "pending" }>,
  extraArgs: string[] = [],
  cwd?: string,
): Promise<string> {
  const args = ["git", "diff"];
  if (source.type === "branch") args.push(`${source.base}...HEAD`);
  else if (source.staged) args.push("--cached");
  args.push(...extraArgs);

  try {
    if (source.type === "pending" && !source.staged) {
      const [trackedPatch, untrackedPatch] = await Promise.all([
        run(args, cwd),
        getUntrackedPatch(cwd),
      ]);
      return [trackedPatch, untrackedPatch].filter(Boolean).join("\n");
    }

    return await run(args, cwd);
  } catch (err) {
    // If branch mode fails (e.g. no commits), fall back to unstaged
    if (source.type === "branch") {
      return run(["git", "diff", ...extraArgs], cwd);
    }
    throw err;
  }
}

/** Whether the working tree has any change, tracked or not. */
export async function hasPendingChanges(cwd?: string): Promise<boolean> {
  return (await run(["git", "status", "--porcelain"], cwd)) !== "";
}
