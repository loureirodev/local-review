import type { DiffMode } from "@shared/types.js";

interface ToolbarProps {
  mode: DiffMode;
  diffStyle: "split" | "unified";
  branch: string;
  baseBranch: string;
  onModeChange: (mode: DiffMode) => void;
  onDiffStyleChange: (style: "split" | "unified") => void;
  onExportReview: () => void;
  exporting: boolean;
}

const modeLabels: Record<DiffMode, string> = {
  unstaged: "Unstaged",
  staged: "Staged",
  branch: "Branch",
};

export default function Toolbar({
  mode,
  diffStyle,
  branch,
  baseBranch,
  onModeChange,
  onDiffStyleChange,
  onExportReview,
  exporting,
}: ToolbarProps) {
  return (
    <header className="flex items-center gap-4 px-4 py-2 bg-neutral-900 border-b border-neutral-800 flex-shrink-0">
      {/* Branch info */}
      <div className="text-sm text-neutral-400">
        <span className="font-mono text-neutral-200">{branch}</span>
        {mode === "branch" && (
          <span className="text-neutral-600">
            {" "}
            vs{" "}
            <span className="font-mono text-neutral-400">{baseBranch}</span>
          </span>
        )}
      </div>

      <div className="h-4 w-px bg-neutral-700" />

      {/* Diff mode selector */}
      <div className="flex items-center gap-1">
        {(Object.keys(modeLabels) as DiffMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              mode === m
                ? "bg-blue-600 text-white"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            }`}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-neutral-700" />

      {/* View style toggle */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onDiffStyleChange("split")}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            diffStyle === "split"
              ? "bg-neutral-700 text-white"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          }`}
        >
          Split
        </button>
        <button
          onClick={() => onDiffStyleChange("unified")}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            diffStyle === "unified"
              ? "bg-neutral-700 text-white"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          }`}
        >
          Unified
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export button */}
      <button
        onClick={onExportReview}
        disabled={exporting}
        className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded transition-colors"
      >
        {exporting ? "Exporting..." : "Export Review"}
      </button>
    </header>
  );
}
