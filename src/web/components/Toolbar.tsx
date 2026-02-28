import type { DiffMode } from "@shared/types.js";
import SettingsPopover from "./SettingsPopover.js";

interface ToolbarProps {
  mode: DiffMode;
  diffStyle: "split" | "unified";
  branch: string;
  baseBranch: string;
  wrapLines: boolean;
  showLineNumbers: boolean;
  nestedTree: boolean;
  fontSize: number;
  lineHeight: number;
  onModeChange: (mode: DiffMode) => void;
  onDiffStyleChange: (style: "split" | "unified") => void;
  onWrapLinesChange: (wrap: boolean) => void;
  onShowLineNumbersChange: (show: boolean) => void;
  onNestedTreeChange: (nested: boolean) => void;
  onFontSizeChange: (size: number) => void;
  onLineHeightChange: (height: number) => void;
  onExportReview: () => void;
  exporting: boolean;
}

const modeLabels: Record<DiffMode, string> = {
  unstaged: "Unstaged",
  staged: "Staged",
  branch: "Branch",
};

function BranchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="5" cy="4" r="2" />
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="6" r="2" />
      <path d="M5 6v4M10 6c-2 0-5 0-5 4" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 13h8M8 3v7M5 6l3-3 3 3" />
    </svg>
  );
}

export default function Toolbar({
  mode,
  diffStyle,
  branch,
  baseBranch,
  wrapLines,
  showLineNumbers,
  nestedTree,
  fontSize,
  lineHeight,
  onModeChange,
  onDiffStyleChange,
  onWrapLinesChange,
  onShowLineNumbersChange,
  onNestedTreeChange,
  onFontSizeChange,
  onLineHeightChange,
  onExportReview,
  exporting,
}: ToolbarProps) {
  return (
    <header className="flex items-center gap-3 px-3 py-1.5 bg-neutral-900/95 border-b border-neutral-800/80 flex-shrink-0 backdrop-blur-sm">
      {/* Branch info */}
      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
        <BranchIcon />
        <span className="font-mono font-medium text-neutral-200">{branch}</span>
        {mode === "branch" && (
          <span className="text-neutral-600">
            {"→ "}
            <span className="font-mono text-neutral-400">{baseBranch}</span>
          </span>
        )}
      </div>

      <div className="h-3.5 w-px bg-neutral-700/60" />

      {/* Diff mode selector */}
      <div className="flex items-center gap-0.5 p-0.5 bg-neutral-800/50 rounded">
        {(Object.keys(modeLabels) as DiffMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`px-2 py-0.5 text-xs rounded transition-all duration-150 ${
              mode === m
                ? "bg-blue-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>

      <div className="h-3.5 w-px bg-neutral-700/60" />

      {/* Settings popover */}
      <SettingsPopover
        diffStyle={diffStyle}
        wrapLines={wrapLines}
        showLineNumbers={showLineNumbers}
        nestedTree={nestedTree}
        fontSize={fontSize}
        lineHeight={lineHeight}
        onDiffStyleChange={onDiffStyleChange}
        onWrapLinesChange={onWrapLinesChange}
        onShowLineNumbersChange={onShowLineNumbersChange}
        onNestedTreeChange={onNestedTreeChange}
        onFontSizeChange={onFontSizeChange}
        onLineHeightChange={onLineHeightChange}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export button */}
      <button
        type="button"
        onClick={onExportReview}
        disabled={exporting}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-green-600/90 hover:bg-green-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded transition-colors"
      >
        <ExportIcon />
        {exporting ? "Exporting..." : "Export"}
      </button>
    </header>
  );
}
