import type { LaunchSource } from "@shared/types.js";
import { useSettings } from "../hooks/useSettings";
import { useTheme } from "../hooks/useTheme";
import { Button, IconButton, SegmentedControl } from "./Button";
import {
  BranchIcon,
  ExportIcon,
  FolderIcon,
  ICON_SIZE_INLINE,
  SidebarIcon,
  ThemeIcon,
} from "./icons";
import SettingsPopover from "./SettingsPopover";

interface ToolbarProps {
  /** Launch mode, with the pending view currently shown. */
  source: LaunchSource;
  /** Current branch; unused in folder mode. */
  branch: string;
  sidebarCollapsed: boolean;
  reviewedCount: number;
  totalFiles: number;
  onToggleSidebar: () => void;
  onStagedChange: (staged: boolean) => void;
  onExportReview: () => void;
  exporting: boolean;
}

const PENDING_VIEWS = [
  { value: "unstaged", label: "Unstaged" },
  { value: "staged", label: "Staged" },
] as const;

function Divider() {
  return <div className="h-4 w-px bg-hair mx-1" />;
}

function SourceInfo({
  source,
  branch,
  onStagedChange,
}: Pick<ToolbarProps, "source" | "branch" | "onStagedChange">) {
  if (source.type === "folder") {
    return (
      <div
        className="flex items-center gap-1.5 px-1.5 text-xs text-muted min-w-0"
        title={source.path}
      >
        <FolderIcon size={ICON_SIZE_INLINE} />
        <span className="font-medium text-text truncate">{source.path}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 px-1.5 text-xs text-muted">
        <BranchIcon size={ICON_SIZE_INLINE} />
        <span className="font-medium text-text">{branch}</span>
        {source.type === "branch" ? (
          <span className="text-faint">
            {"→ "}
            <span className="text-muted">{source.base}</span>
          </span>
        ) : null}
      </div>

      {source.type === "pending" ? (
        <>
          <Divider />
          <SegmentedControl
            aria-label="Pending changes view"
            value={source.staged ? "staged" : "unstaged"}
            options={PENDING_VIEWS}
            onChange={(view) => onStagedChange(view === "staged")}
          />
        </>
      ) : null}
    </>
  );
}

export default function Toolbar({
  source,
  branch,
  sidebarCollapsed,
  reviewedCount,
  totalFiles,
  onToggleSidebar,
  onStagedChange,
  onExportReview,
  exporting,
}: ToolbarProps) {
  const { state: settings, actions } = useSettings();
  const { theme, setOverride } = useTheme();
  // A straight flip of what is on screen: picking "system" back is a menu
  // action, not something a one-glyph button can express.
  const nextTheme = theme === "dark" ? "light" : "dark";

  const progressPercent = totalFiles > 0 ? Math.round((reviewedCount / totalFiles) * 100) : 0;

  return (
    <header className="flex items-center h-10 px-1 bg-panel border-b border-hair flex-shrink-0 z-20">
      {/* ── Left zone ── */}
      <div className="flex items-center gap-0.5 min-w-0">
        {/* Sidebar toggle */}
        <IconButton
          onClick={onToggleSidebar}
          title={`${sidebarCollapsed ? "Show" : "Hide"} file list (Ctrl+B)`}
          aria-label={`${sidebarCollapsed ? "Show" : "Hide"} file list`}
        >
          <SidebarIcon collapsed={sidebarCollapsed} />
        </IconButton>

        <Divider />

        <SourceInfo source={source} branch={branch} onStagedChange={onStagedChange} />
      </div>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Right zone ── */}
      <div className="flex items-center gap-0.5">
        {/* Review progress */}
        {totalFiles > 0 ? (
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1 bg-track rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-muted">
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
          fontSize={settings.fontSize}
          lineHeight={settings.lineHeight}
          onDiffStyleChange={(v) => actions.update("diffStyle", v)}
          onWrapLinesChange={(v) => actions.update("wrapLines", v)}
          onShowLineNumbersChange={(v) => actions.update("showLineNumbers", v)}
          onFontSizeChange={(v) => actions.update("fontSize", v)}
          onLineHeightChange={(v) => actions.update("lineHeight", v)}
        />

        <Divider />

        <IconButton
          onClick={() => setOverride(nextTheme)}
          title={`Switch to ${nextTheme} theme`}
          aria-label={`Switch to ${nextTheme} theme`}
        >
          <ThemeIcon theme={nextTheme} />
        </IconButton>

        <Divider />

        {/* Export button */}
        <div className="mr-1">
          <Button onClick={onExportReview} disabled={exporting}>
            <ExportIcon size={ICON_SIZE_INLINE} />
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>
    </header>
  );
}
