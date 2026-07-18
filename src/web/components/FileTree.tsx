import type { GitStatusEntry } from "@pierre/trees";
import { FileTree as PierreFileTree, useFileTree, useFileTreeSelection } from "@pierre/trees/react";
import type { FileReviewState } from "@shared/types.js";
import { useEffect, useMemo, useRef } from "react";
import { useCollapse } from "../context/CollapseContext";
import { useSettings } from "../hooks/useSettings";

interface FileTreeProps {
  files: FileInfo[];
  reviewFiles: Record<string, FileReviewState>;
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
}

export interface FileInfo {
  name: string;
  type: "new" | "deleted" | "renamed" | "renamed-changed" | "change";
}

const FILE_TYPE_TO_GIT_STATUS: Record<FileInfo["type"], GitStatusEntry["status"]> = {
  new: "untracked",
  deleted: "deleted",
  renamed: "renamed",
  "renamed-changed": "renamed",
  change: "modified",
};

const FONT_FAMILY =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

const TREE_STYLE_BASE = {
  flex: 1,
  minHeight: 0,
  "--trees-bg-override": "transparent",
  "--trees-fg-override": "#d4d4d4",
  "--trees-theme-list-hover-bg": "rgba(38,38,38,0.5)",
  "--trees-selected-bg-override": "rgba(38,38,38,0.7)",
  "--trees-selected-fg-override": "#f5f5f5",
  "--trees-status-untracked-override": "rgba(74,222,128,0.8)",
  "--trees-status-added-override": "rgba(74,222,128,0.8)",
  "--trees-status-deleted-override": "rgba(248,113,113,0.8)",
  "--trees-status-modified-override": "rgba(250,204,21,0.8)",
  "--trees-status-renamed-override": "rgba(96,165,250,0.8)",
  "--trees-padding-inline-override": "8px",
  "--trees-font-family-override": FONT_FAMILY,
} as React.CSSProperties;

// Injected once into the shadow root via unsafeCSS (higher specificity than base layer).
const UNSAFE_CSS = `
  :host {
    color-scheme: dark;
  }

  /* Fix truncation ellipsis: without color-scheme the light-dark() fallback is
     transparent, so the … marker overlaps the clipped text instead of covering it. */
  [data-truncate-container] {
    --truncate-marker-background-color: rgb(10, 10, 10);
  }

  /* Hide the M/U/D/R git letter — the filename color already conveys the status. */
  [data-item-section='git'] {
    display: none;
  }

  /* When a badge is present, reserve enough width so it's never crushed by a long
     filename. The section keeps flex: 1 1 0 (spacer) so items stay right-aligned;
     min-width only kicks in when there is a child span. */
  [data-item-section='decoration']:has(> span) {
    min-width: 24px;
  }

  [data-item-section='decoration'] > span {
    background-color: rgba(79, 70, 229, 0.2);
    color: rgba(165, 180, 252, 0.85);
    border-radius: 999px;
    padding: 0 5px;
    font-size: 10px;
    font-weight: 600;
    min-width: 16px;
    height: 16px;
    line-height: 16px;
    box-sizing: border-box;
    align-self: center;
    justify-content: center;
    flex-shrink: 0;
  }
`;

/* ── Footer ── */

function CollapseFooter() {
  const { totalFiles, collapsedCount, setAllCollapsed } = useCollapse();
  if (totalFiles === 0) return null;
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-t border-neutral-800/50 bg-neutral-950/40 text-[11px] text-neutral-500">
      <span className="flex-1 truncate">
        {totalFiles} file{totalFiles !== 1 ? "s" : ""}
        {collapsedCount > 0 && ` · ${collapsedCount} collapsed`}
      </span>
      <button
        type="button"
        onClick={() => setAllCollapsed(true)}
        className="hover:text-neutral-300 transition-colors"
        title="Collapse all files"
      >
        Collapse all
      </button>
      <span className="text-neutral-700">·</span>
      <button
        type="button"
        onClick={() => setAllCollapsed(false)}
        className="hover:text-neutral-300 transition-colors"
        title="Expand all files"
      >
        Expand all
      </button>
    </div>
  );
}

/* ── Main Component ── */

export default function FileTree({
  files,
  reviewFiles,
  selectedFile,
  onSelectFile,
}: FileTreeProps) {
  const { state: settings } = useSettings();
  const reviewFilesRef = useRef(reviewFiles);
  reviewFilesRef.current = reviewFiles;

  const treeStyle = useMemo(
    () =>
      ({
        ...TREE_STYLE_BASE,
        "--trees-font-size-override": `${settings.fontSize}px`,
      }) as React.CSSProperties,
    [settings.fontSize],
  );

  const { model } = useFileTree({
    paths: files.map((f) => f.name),
    initialExpansion: "open",
    unsafeCSS: UNSAFE_CSS,
    renderRowDecoration: ({ item }) => {
      if (item.kind !== "file") return null;
      const count = reviewFilesRef.current[item.path]?.comments.length ?? 0;
      return count > 0
        ? { text: String(count), title: `${count} comment${count !== 1 ? "s" : ""}` }
        : null;
    },
  });

  // Sync paths when files change
  useEffect(() => {
    model.resetPaths(files.map((f) => f.name));
  }, [files, model]);

  // Sync git status. Also re-runs on reviewFiles changes so the Preact tree
  // re-renders and picks up updated renderRowDecoration outputs (comment counts).
  const gitEntries = useMemo<GitStatusEntry[]>(
    () => files.map((f) => ({ path: f.name, status: FILE_TYPE_TO_GIT_STATUS[f.type] })),
    [files],
  );
  // reviewFiles in deps is an intentional re-render trigger: when comments change
  // the Preact tree re-renders and calls renderRowDecoration with fresh data.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reviewFiles triggers re-render
  useEffect(() => {
    model.setGitStatus(gitEntries);
  }, [gitEntries, reviewFiles, model]);

  const viewedFiles = useMemo(
    () => Object.keys(reviewFiles).filter((path) => reviewFiles[path].viewed),
    [reviewFiles],
  );

  // Sync viewed state via a custom style element injected into the shadow root.
  useEffect(() => {
    const container = model.getFileTreeContainer();
    const shadowRoot = container?.shadowRoot;
    if (!shadowRoot) return;

    const rules = viewedFiles.map((path) => {
      const escaped = path.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
      return `button[data-item-path="${escaped}"] { opacity: 0.4; }`;
    });

    let style = shadowRoot.querySelector<HTMLStyleElement>("style[data-viewed-css]");
    if (!style) {
      style = document.createElement("style");
      style.setAttribute("data-viewed-css", "");
      shadowRoot.appendChild(style);
    }
    style.textContent = rules.join("\n");
  }, [viewedFiles, model]);

  // Stamp title=<full-path> on every row button so truncated names show a tooltip.
  // Uses a MutationObserver because the tree is virtualized (rows appear on scroll).
  useEffect(() => {
    const container = model.getFileTreeContainer();
    const shadowRoot = container?.shadowRoot;
    if (!shadowRoot) return;

    const stamp = () => {
      for (const btn of shadowRoot.querySelectorAll<HTMLElement>(
        "button[data-item-path]:not([title])",
      )) {
        btn.title = btn.dataset.itemPath ?? "";
      }
    };
    stamp();
    const observer = new MutationObserver(stamp);
    observer.observe(shadowRoot, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [model]);

  const filePathSet = useMemo(() => new Set(files.map((f) => f.name)), [files]);
  const selectedPaths = useFileTreeSelection(model);
  const prevSelectionRef = useRef<readonly string[]>([]);
  // Fresh read of selectedFile for the navigation guard below (avoids a stale
  // closure when scroll-driven active tracking updates it).
  const selectedFileRef = useRef(selectedFile);
  selectedFileRef.current = selectedFile;

  // Reflect selectedFile → tree highlight. Depends on selectedFile ONLY: it must
  // NOT run on raw selection changes from a user click (the click sets the
  // selection first and selectedFile lags by a render) or it would re-focus the
  // stale selectedFile and undo the click.
  useEffect(() => {
    if (selectedFile) model.focusPath(selectedFile);
  }, [selectedFile, model]);

  // Tree selection → navigation. A real click selects a file that differs from
  // the current selectedFile → navigate. Scroll-driven active tracking sets
  // selectedFile AND focuses that same file, so its selection echo has
  // path === selectedFile and is skipped — no scroll→navigate feedback loop.
  useEffect(() => {
    if (selectedPaths === prevSelectionRef.current) return;
    prevSelectionRef.current = selectedPaths;
    const path = selectedPaths[0];
    if (selectedPaths.length === 1 && path !== selectedFileRef.current && filePathSet.has(path)) {
      onSelectFile(path);
    }
  }, [selectedPaths, onSelectFile, filePathSet]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    model.setSearch(e.target.value || null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b border-neutral-800/40">
        <input
          type="text"
          placeholder="Filter files..."
          onChange={handleSearchChange}
          className="w-full px-2 py-1 text-[13px] font-mono bg-neutral-900/60 border border-neutral-800/60 rounded-md focus:outline-none focus:border-neutral-600 text-neutral-200 placeholder-neutral-600 transition-colors"
        />
      </div>

      {/* Tree */}
      <PierreFileTree model={model} style={treeStyle} />

      <CollapseFooter />
    </div>
  );
}
