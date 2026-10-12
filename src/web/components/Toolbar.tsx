import type { LaunchSource } from "@shared/types";
import { useSettings } from "../hooks/useSettings";
import { useTheme } from "../hooks/useTheme";
import { Button, IconButton, SegmentedControl } from "./Button";
import {
  BranchIcon,
  ExportIcon,
  FolderIcon,
  ICON_SIZE_INLINE,
  LogoMark,
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

function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-4 w-px bg-hair mx-1 ${className}`} />;
}

function SourceInfo({
  source,
  branch,
  onStagedChange,
}: Pick<ToolbarProps, "source" | "branch" | "onStagedChange">) {
  if (source.type === "folder") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted min-w-0" title={source.path}>
        <FolderIcon size={ICON_SIZE_INLINE} />
        <span className="font-medium text-text truncate">{source.path}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 text-xs text-muted min-w-0">
        <BranchIcon size={ICON_SIZE_INLINE} />
        <span className="font-medium text-text truncate" title={branch}>
          {branch}
        </span>
        {source.type === "branch" ? (
          <span className="text-faint truncate">
            {"→ "}
            <span className="text-muted">{source.base}</span>
          </span>
        ) : null}
      </div>

      {source.type === "pending" ? (
        <SegmentedControl
          aria-label="Pending changes view"
          value={source.staged ? "staged" : "unstaged"}
          options={PENDING_VIEWS}
          onChange={(view) => onStagedChange(view === "staged")}
        />
      ) : null}
    </>
  );
}

/** Viewed-files ring, in the viewed toggle's success colours. */
function ReviewProgress({ viewed, total }: { viewed: number; total: number }) {
  const percent = Math.round((viewed / total) * 100);
  const done = viewed === total;
  const digits = String(total).length;
  const label = done ? `All ${total} files viewed` : `${viewed} of ${total} files viewed`;

  return (
    <div
      role="progressbar"
      aria-label="Files viewed"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={viewed}
      aria-valuetext={label}
      title={label}
      className={`flex items-center gap-1.5 h-7 px-2 mx-0.5 rounded-md text-[11px] font-medium transition-colors duration-300 ${
        done ? "bg-success/18 text-success" : "text-muted"
      }`}
    >
      <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden="true">
        <g transform="rotate(-90 8 8)" fill="none" strokeWidth="2">
          <circle cx="8" cy="8" r="6" className="stroke-track" />
          <circle
            cx="8"
            cy="8"
            r="6"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - percent}
            className={`stroke-success transition-[stroke-dashoffset] duration-300 ease-out ${
              viewed === 0 ? "opacity-0" : ""
            }`}
          />
        </g>
        {/* Not CheckIcon: centred on the ring's 16px grid, not a 24px box. */}
        <path
          d="M5.5 8l1.75 1.75 3.25-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`origin-center [transform-box:fill-box] transition-[scale,opacity] duration-300 ease-out ${
            done ? "scale-100 opacity-100" : "scale-0 opacity-0"
          }`}
        />
      </svg>
      {/* Lexend digits are proportional; the widest invisible copy fixes the width. */}
      <span className="grid">
        {Array.from("0123456789", (d) => (
          <span key={d} aria-hidden="true" className="invisible col-start-1 row-start-1">
            {d.repeat(digits)} / {total}
          </span>
        ))}
        <span className="col-start-1 row-start-1">
          <span className={done ? undefined : "text-text"}>{viewed}</span>
          <span className={done ? undefined : "text-muted"}> / {total}</span>
        </span>
      </span>
    </div>
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

  return (
    <header className="flex flex-wrap md:flex-nowrap items-center bg-panel border-b border-hair flex-shrink-0 z-20">
      {/* As wide as the sidebar from md up, so what is under review starts where
          the diff does; the width alone marks the column, with or without the
          sidebar showing, so it needs no rule. */}
      <div className="flex items-center gap-0.5 md:gap-2 h-10 px-1 shrink-0 md:w-sidebar">
        <div className="flex items-center gap-1.5 px-1.5 text-text shrink-0" title="local-review">
          <LogoMark size={26} />
          {/* Wordmark from md up; below that the mark alone, named for screen readers. */}
          <span className="sr-only md:not-sr-only text-sm font-semibold tracking-tight">
            local-<span className="text-accent">review</span>
          </span>
        </div>

        {/* From md up the wordmark's gap separates them instead. */}
        <Divider className="md:hidden" />

        <IconButton
          onClick={onToggleSidebar}
          title={`${sidebarCollapsed ? "Show" : "Hide"} file list (Ctrl+B)`}
          aria-label={`${sidebarCollapsed ? "Show" : "Hide"} file list`}
        >
          <SidebarIcon collapsed={sidebarCollapsed} />
        </IconButton>
      </div>

      {/* What is under review: a second row on phones, where one row cannot hold it. */}
      <div className="order-last md:order-none flex items-center gap-2 w-full md:w-auto min-w-0 h-9 md:h-10 px-3 border-t md:border-t-0 border-hair">
        <SourceInfo source={source} branch={branch} onStagedChange={onStagedChange} />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-0.5 h-10 pr-1">
        {totalFiles > 0 ? <ReviewProgress viewed={reviewedCount} total={totalFiles} /> : null}

        <Divider />

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

        <Button onClick={onExportReview} disabled={exporting}>
          <ExportIcon size={ICON_SIZE_INLINE} />
          <span className="max-sm:sr-only">{exporting ? "Exporting..." : "Export"}</span>
        </Button>
      </div>
    </header>
  );
}
