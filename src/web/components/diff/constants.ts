export const THEME = { dark: "github-dark", light: "github-light" } as const;

function workerFactory(): Worker {
  return new Worker(new URL("@pierre/diffs/worker/worker.js", import.meta.url), {
    type: "module",
  });
}

export const WORKER_POOL_OPTIONS = { workerFactory, poolSize: 4 } as const;
export const HIGHLIGHTER_OPTIONS = { theme: THEME, lineDiffType: "word" as const };
