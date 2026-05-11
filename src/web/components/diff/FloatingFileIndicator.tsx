import type { FileDiffMetadata } from "@pierre/diffs/react";

interface FloatingFileIndicatorProps {
  fileDiff: FileDiffMetadata;
  additions: number;
  deletions: number;
  state: "open" | "closed";
}

export function FloatingFileIndicator({
  fileDiff,
  additions,
  deletions,
  state,
}: FloatingFileIndicatorProps) {
  return (
    // Outer wrapper handles horizontal centering; inner runs the
    // enter/exit animation via [data-state]. Splitting them avoids conflicts
    // between Tailwind's -translate-x-1/2 and the keyframe's translateY.
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[80%]">
      <div
        data-state={state}
        className="floating-file-indicator flex items-center gap-2 px-3 py-1 font-mono text-[11px] bg-neutral-900/90 backdrop-blur-md border border-neutral-700/60 rounded-full shadow-lg shadow-black/40"
      >
        <span className="text-neutral-200 truncate" title={fileDiff.name}>
          {fileDiff.name}
        </span>
        <span className="flex items-center gap-1.5 flex-shrink-0 text-[10px]">
          <span className="text-green-400/90">+{additions}</span>
          <span className="text-red-400/90">−{deletions}</span>
        </span>
      </div>
    </div>
  );
}
