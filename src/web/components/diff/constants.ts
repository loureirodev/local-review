export const THEME = { dark: "github-dark", light: "github-light" } as const;

function workerFactory(): Worker {
  return new Worker(new URL("@pierre/diffs/worker/worker.js", import.meta.url), {
    type: "module",
  });
}

export const WORKER_POOL_OPTIONS = { workerFactory, poolSize: 4 } as const;
export const HIGHLIGHTER_OPTIONS = { theme: THEME, lineDiffType: "word" as const };

// @pierre/diffs header is min-height: calc(1lh + gap-block * 3) with default
// gap-block of 8px. We pass lineHeight from settings.
const HEADER_GAP = 24;
export const MAX_ESTIMATED_LINES = 200;

// Below this total line count we skip @tanstack/react-virtual entirely so
// native smooth-scroll works and the DOM stays simple. Above it we virtualize
// to avoid rendering thousands of FileDiff nodes at once.
export const VIRTUALIZATION_THRESHOLD = 2000;

export function computeHeaderHeight(lineHeight: number): number {
  return lineHeight + HEADER_GAP;
}
