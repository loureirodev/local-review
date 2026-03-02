import type { DiffMode } from "@shared/types.js";
import { useSettings } from "../hooks/useSettings.js";
import { BranchIcon, ExportIcon, SidebarIcon } from "./icons.js";
import SettingsPopover from "./SettingsPopover.js";

interface ToolbarProps {
  mode: DiffMode;
  branch: string;
  baseBranch: string;
  sidebarCollapsed: boolean;
  reviewedCount: number;
  totalFiles: number;
  onToggleSidebar: () => void;
  onModeChange: (mode: DiffMode) => void;
  onExportReview: () => void;
  exporting: boolean;
}

const modeLabels: Record<DiffMode, string> = {
  unstaged: "Unstaged",
  staged: "Staged",
  branch: "Branch",
};

function Divider() {
  return <div className="h-4 w-px bg-neutral-800/60 mx-1" />;
}

export default function Toolbar({
  mode,
  branch,
  baseBranch,
  sidebarCollapsed,
  reviewedCount,
  totalFiles,
  onToggleSidebar,
  onModeChange,
  onExportReview,
  exporting,
}: ToolbarProps) {
  const { state: settings, actions } = useSettings();

  const progressPercent = totalFiles > 0 ? Math.round((reviewedCount / totalFiles) * 100) : 0;

  return (
    <header className="flex items-center h-10 px-1 bg-neutral-900/80 border-b border-neutral-800/40 flex-shrink-0 backdrop-blur-sm z-20">
      {/* ── Left zone ── */}
      <div className="flex items-center gap-0.5">
        {/* Sidebar toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-md transition-colors text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          title={`${sidebarCollapsed ? "Show" : "Hide"} file list (Ctrl+B)`}
        >
          <SidebarIcon collapsed={sidebarCollapsed} />
        </button>

        <Divider />

        {/* Branch info */}
        <div className="flex items-center gap-1.5 px-1.5 text-xs text-neutral-500">
          <BranchIcon />
          <span className="font-mono font-medium text-neutral-300">{branch}</span>
          {mode === "branch" ? (
            <span className="text-neutral-600">
              {"→ "}
              <span className="font-mono text-neutral-500">{baseBranch}</span>
            </span>
          ) : null}
        </div>

        <Divider />

        {/* Diff mode selector */}
        <div className="flex items-center gap-px p-0.5 bg-neutral-800/40 rounded-md">
          {(Object.keys(modeLabels) as DiffMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`px-2.5 py-1 text-xs rounded-[5px] transition-all duration-150 font-medium ${
                mode === m
                  ? "bg-neutral-700/80 text-neutral-100 shadow-sm shadow-black/20"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Right zone ── */}
      <div className="flex items-center gap-0.5">
        {/* Review progress */}
        {totalFiles > 0 ? (
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-neutral-500">
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500/70 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-mono text-[11px] tabular-nums text-neutral-400">
                {reviewedCount}/{totalFiles}
              </span>
            </div>
          </div>
        ) : null}

        <Divider />

        {/* Settings */}
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

        <Divider />

        {/* Export button */}
        <button
          type="button"
          onClick={onExportReview}
          disabled={exporting}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-neutral-800/60 hover:bg-neutral-700/70 disabled:opacity-40 text-neutral-300 hover:text-neutral-100 rounded-md transition-colors mr-1"
        >
          <ExportIcon />
          {exporting ? "Exporting..." : "Export"}
        </button>
      </div>
    </header>
  );
}
