#!/usr/bin/env bun
// CLI entry point for local-review

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DiffMode } from "../shared/types";
import { isGitRepo } from "./git";
import { openBrowser } from "./open-browser";
import { startServer } from "./server";

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

Usage: local-review [options] [<git-diff-args>...]

Options:
  --port <port>        Port to listen on (default: random available port)
  --no-open            Don't open the browser automatically
  --output-file <file> Output file for review XML (default: ./review.xml)
  --existing           Load existing review XML on startup (uses --output-file path)
  --mode <mode>        Diff mode: unstaged, staged, branch (default: unstaged)
  --dev                Development mode (proxy to Vite dev server)
  -h, --help           Show this help message
  -v, --version        Show version number

Examples:
  local-review                       # Review unstaged changes
  local-review --mode staged         # Review staged changes
  local-review --mode branch         # Review all branch changes vs base
  local-review -- --stat             # Pass extra args to git diff
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
  mode: DiffMode;
  devMode: boolean;
  extraArgs: string[];
  shouldExit: boolean;
} {
  const result = {
    port: 0, // 0 = random available port (overridden in dev mode)
    noOpen: false,
    outputFile: "./review.xml",
    loadExisting: false,
    mode: "unstaged" as DiffMode,
    devMode: false,
    extraArgs: [] as string[],
    shouldExit: false,
  };

  let i = 0;
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

      case "--output-file":
        result.outputFile = argv[++i];
        if (!result.outputFile) {
          console.error("Error: --output-file requires a path");
          process.exit(1);
        }
        break;

      case "--mode":
        result.mode = argv[++i] as DiffMode;
        if (!["unstaged", "staged", "branch"].includes(result.mode)) {
          console.error("Error: --mode must be one of: unstaged, staged, branch");
          process.exit(1);
        }
        break;

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

  // Verify we're in a git repo
  if (!(await isGitRepo(cwd))) {
    console.error("Error: not a git repository (or any parent up to mount point)");
    process.exit(1);
  }

  // Start the server (returns the actual bound port)
  const actualPort = startServer({
    port: args.port,
    cwd,
    outputFile: args.outputFile,
    loadExisting: args.loadExisting,
    initialMode: args.mode,
    extraArgs: args.extraArgs,
    devMode: args.devMode,
  });

  if (!args.noOpen) {
    await openBrowser(`http://localhost:${actualPort}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
