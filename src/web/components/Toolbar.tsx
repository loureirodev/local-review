import type { DiffMode } from "@shared/types.js";
import { useSettings } from "../hooks/useSettings.js";
import { BranchIcon, ExportIcon } from "./icons.js";
import SettingsPopover from "./SettingsPopover.js";

interface ToolbarProps {
  mode: DiffMode;
  branch: string;
  baseBranch: string;
  onModeChange: (mode: DiffMode) => void;
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
  branch,
  baseBranch,
  onModeChange,
  onExportReview,
  exporting,
}: ToolbarProps) {
  const { state: settings, actions } = useSettings();

  return (
    <header className="flex items-center gap-3 px-3 py-1.5 bg-neutral-900/95 border-b border-neutral-800/80 flex-shrink-0 backdrop-blur-sm">
      {/* Branch info */}
      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
        <BranchIcon />
        <span className="font-mono font-medium text-neutral-200">{branch}</span>
        {mode === "branch" ? (
          <span className="text-neutral-600">
            {"→ "}
            <span className="font-mono text-neutral-400">{baseBranch}</span>
          </span>
        ) : null}
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
        diffStyle={settings.diffStyle}
        wrapLines={settings.wrapLines}
        showLineNumbers={settings.showLineNumbers}
        nestedTree={settings.nestedTree}
        fontSize={settings.fontSize}
        lineHeight={settings.lineHeight}
        onDiffStyleChange={(v) => actions.update("diffStyle", v)}
        onWrapLinesChange={(v) => actions.update("wrapLines", v)}
        onShowLineNumbersChange={(v) => actions.update("showLineNumbers", v)}
        onNestedTreeChange={(v) => actions.update("nestedTree", v)}
        onFontSizeChange={(v) => actions.update("fontSize", v)}
        onLineHeightChange={(v) => actions.update("lineHeight", v)}
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
