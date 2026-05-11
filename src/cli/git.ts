// Git operations using Bun.spawn

import type { DiffMode } from "../shared/types";

/** Run a shell command and return its stdout. */
async function run(cmd: string[], cwd?: string, allowedExitCodes: number[] = [0]): Promise<string> {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
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

/** Run git diff with the given mode and return raw patch text. */
export async function getGitDiff(
  mode: DiffMode,
  extraArgs: string[] = [],
  cwd?: string,
): Promise<string> {
  const args = ["git", "diff"];

  switch (mode) {
    case "unstaged":
      // Default git diff (working tree vs index)
      break;
    case "staged":
      args.push("--cached");
      break;
    case "branch": {
      const base = await getBaseBranch(cwd);
      args.push(`${base}...HEAD`);
      break;
    }
  }

  args.push(...extraArgs);

  try {
    if (mode === "unstaged") {
      const [trackedPatch, untrackedPatch] = await Promise.all([
        run(args, cwd),
        getUntrackedPatch(cwd),
      ]);
      return [trackedPatch, untrackedPatch].filter(Boolean).join("\n");
    }

    return await run(args, cwd);
  } catch (err) {
    // If branch mode fails (e.g. no commits), fall back to unstaged
    if (mode === "branch") {
      return run(["git", "diff", ...extraArgs], cwd);
    }
    throw err;
  }
}
