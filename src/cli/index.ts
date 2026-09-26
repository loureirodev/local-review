#!/usr/bin/env bun
// CLI entry point for local-review

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import type { LaunchSource, ReviewState } from "../shared/types";
import { findWorktree, getBaseBranch, getCheckout, hasPendingChanges, isGitRepo } from "./git";
import { openBrowser } from "./open-browser";
import {
  type CheckResult,
  checkRevision,
  deriveLaunchSource,
  describeCheck,
  EXIT_BLOCKED,
  isBlocking,
  noReviewResult,
} from "./review-check";
import { startServer } from "./server";
import { deserializeReview, isLegacyReview } from "./xml-deserializer";

const __dirname = dirname(fileURLToPath(import.meta.url));
let version = "unknown";
try {
  const packageJson = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));
  version = packageJson.version;
} catch {
  // Fallback if package.json can't be read
}

function printHelp(): void {
  console.error(
    `
local-review - Lightweight web-based git diff review tool

Usage: local-review [options] [-- <git-diff-args>...]
       local-review check [--output-file <file>] [--json]

Modes (fixed for the session):
  (default)            Pending changes, with an Unstaged | Staged toggle in the UI
  --branch [base]      Current branch vs <base> (default: main, master or develop)
  --folder <path>      Review the files of a folder; no git repository needed

Options:
  --port <port>        Port to listen on (default: random available port)
  --no-open            Don't open the browser automatically
  --output-file <file> Output file for review XML (default: ./review.xml)
  --existing           Load existing review XML on startup (uses --output-file path).
                       Without a mode flag, the mode comes from the review. Stops
                       if the review was made on another branch (asks in a terminal)
  --no-check           With --existing, skip the branch check
  --json               Print the branch check result as JSON; never prompts
  --theme <theme>      Force the theme for this session: light, dark
                       (default: the saved preference, else the system theme)
  --dev                Development mode (proxy to Vite dev server)
  -h, --help           Show this help message
  -v, --version        Show version number

Examples:
  local-review                       # Review pending (unstaged/staged) changes
  local-review --branch              # Review all branch changes vs the detected base
  local-review --branch develop      # Review all branch changes vs develop
  local-review --folder ./docs       # Review the files under ./docs
  local-review --theme light         # Force the light theme for this session
  local-review -- --stat             # Pass extra args to git diff
  local-review check --json          # Check review.xml against the checkout; exit 3 if blocked
`.trim(),
  );
}

function printVersion(): void {
  console.error(`local-review v${version}`);
}

function parseArgs(argv: string[]): {
  port: number;
  noOpen: boolean;
  outputFile: string;
  loadExisting: boolean;
  branch: string | true | undefined;
  folder: string | undefined;
  theme: "light" | "dark" | undefined;
  devMode: boolean;
  noCheck: boolean;
  json: boolean;
  command: "launch" | "check";
  extraArgs: string[];
  shouldExit: boolean;
} {
  const result = {
    port: 0, // 0 = random available port (overridden in dev mode)
    noOpen: false,
    outputFile: "./review.xml",
    loadExisting: false,
    branch: undefined as string | true | undefined,
    folder: undefined as string | undefined,
    theme: undefined as "light" | "dark" | undefined,
    devMode: false,
    noCheck: false,
    json: false,
    command: "launch" as "launch" | "check",
    extraArgs: [] as string[],
    shouldExit: false,
  };

  let i = 0;
  if (argv[0] === "check") {
    result.command = "check";
    i = 1;
  }
  while (i < argv.length) {
    const arg = argv[i];

    switch (arg) {
      case "-h":
      case "--help":
        printHelp();
        result.shouldExit = true;
        return result;

      case "-v":
      case "--version":
        printVersion();
        result.shouldExit = true;
        return result;

      case "--port":
        result.port = parseInt(argv[++i], 10);
        if (Number.isNaN(result.port)) {
          console.error("Error: --port requires a valid number");
          process.exit(1);
        }
        break;

      case "--no-open":
        result.noOpen = true;
        break;

      case "--existing":
        result.loadExisting = true;
        break;

      case "--no-check":
        result.noCheck = true;
        break;

      case "--json":
        result.json = true;
        break;

      case "--output-file":
        result.outputFile = argv[++i];
        if (!result.outputFile) {
          console.error("Error: --output-file requires a path");
          process.exit(1);
        }
        break;

      case "--branch": {
        // The base is optional: a missing value or a following flag means autodetect.
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("-")) {
          result.branch = next;
          i++;
        } else {
          result.branch = true;
        }
        break;
      }

      case "--folder": {
        const folder = argv[++i];
        if (!folder || folder.startsWith("-")) {
          console.error("Error: --folder requires a path");
          process.exit(1);
        }
        result.folder = folder;
        break;
      }

      case "--theme": {
        const theme = argv[++i];
        if (theme !== "light" && theme !== "dark") {
          console.error("Error: --theme must be one of: light, dark");
          process.exit(1);
        }
        result.theme = theme;
        break;
      }

      case "--dev":
        result.devMode = true;
        if (result.port === 0) result.port = 3000;
        break;

      case "--":
        // Everything after -- is passed to git diff
        result.extraArgs.push(...argv.slice(i + 1));
        return result;

      default:
        result.extraArgs.push(arg);
        break;
    }

    i++;
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.shouldExit) {
    process.exit(0);
  }

  const cwd = process.cwd();
  const reviewPath = resolve(cwd, args.outputFile);

  if (args.command === "check") {
    const review = readReview(reviewPath);
    const result = review ? await checkReview(review, cwd) : noReviewResult(await getCheckout(cwd));
    report(result, reviewPath, args.json);
    process.exit(result.status === "no-review" ? 1 : isBlocking(result) ? EXIT_BLOCKED : 0);
  }

  if (args.branch !== undefined && args.folder !== undefined) {
    console.error("Error: --branch and --folder are mutually exclusive");
    process.exit(1);
  }

  const review = args.loadExisting ? readReview(reviewPath) : null;

  // Checked before anything starts: a review opened on another branch shows
  // comments against lines that aren't the ones reviewed.
  if (review && !args.noCheck) {
    const result = await checkReview(review, cwd);
    if (isBlocking(result)) {
      report(result, reviewPath, args.json);
      if (args.json || !(await confirmOpenAnyway())) process.exit(EXIT_BLOCKED);
    } else if (!args.json) {
      for (const line of describeCheck(result, reviewPath)) console.error(line);
    }
  }

  // An explicit mode flag wins over the one derived from the review.
  let source: LaunchSource;
  if (args.folder !== undefined) {
    source = { type: "folder", path: resolve(cwd, args.folder) };
  } else if (args.branch !== undefined) {
    const base = args.branch === true ? await getBaseBranch(cwd) : args.branch;
    source = { type: "branch", base };
  } else if (review) {
    source = await deriveLaunchSource(review.source, {
      getBaseBranch: () => getBaseBranch(cwd),
      hasPendingChanges: () => hasPendingChanges(cwd),
    });
  } else {
    source = { type: "pending", staged: false };
  }

  if (source.type === "folder") {
    if (args.extraArgs.length > 0) {
      console.error("Error: git diff arguments are not valid with --folder");
      process.exit(1);
    }
    const info = statSync(source.path, { throwIfNoEntry: false });
    if (!info?.isDirectory()) {
      const problem = info ? "is not a directory" : "does not exist";
      console.error(`Error: --folder path ${problem}: ${source.path}`);
      process.exit(1);
    }
  } else if (!(await isGitRepo(cwd))) {
    console.error("Error: not a git repository (or any parent up to mount point)");
    process.exit(1);
  }

  // Start the server (returns the actual bound port)
  const actualPort = startServer({
    port: args.port,
    cwd,
    outputFile: args.outputFile,
    loadExisting: args.loadExisting,
    source,
    extraArgs: args.extraArgs,
    devMode: args.devMode,
    themeOverride: args.theme,
  });

  if (!args.noOpen) {
    await openBrowser(`http://localhost:${actualPort}`);
  }
}

function readReview(path: string): ReviewState | null {
  if (!existsSync(path)) return null;
  try {
    const xml = readFileSync(path, "utf-8");
    if (isLegacyReview(xml)) {
      console.error(
        `Warning: ${path} uses the pre-0.4 format (<source type="local">); it opens as pending changes. Re-export it to record its mode and branch.`,
      );
    }
    return deserializeReview(xml);
  } catch {
    return null;
  }
}

async function checkReview(review: ReviewState, cwd: string): Promise<CheckResult> {
  const folderExists =
    review.source.type === "folder" &&
    (statSync(review.source.path, { throwIfNoEntry: false })?.isDirectory() ?? false);
  const result = checkRevision(review.source, await getCheckout(cwd), folderExists);
  // `git switch` refuses a branch checked out in another worktree; point there instead.
  if (result.status === "branch-mismatch" && result.expected.head) {
    result.expected.worktree = await findWorktree(result.expected.head, cwd);
  }
  return result;
}

function report(result: CheckResult, reviewPath: string, json: boolean): void {
  if (json) console.log(JSON.stringify(result, null, 2));
  else for (const line of describeCheck(result, reviewPath)) console.error(line);
}

/** Asks only in a terminal: agents, scripts and CI get the exit status instead. */
async function confirmOpenAnyway(): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error("Pass --no-check to open it anyway.");
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await rl.question("Open it anyway? [y/N] ");
    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
