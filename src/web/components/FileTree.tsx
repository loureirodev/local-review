import type { GitStatusEntry } from "@pierre/trees";
import { FileTree as PierreFileTree, useFileTree, useFileTreeSelection } from "@pierre/trees/react";
import type { FileReviewState } from "@shared/types.js";
import { useEffect, useMemo, useRef } from "react";
import { useCollapse } from "../context/CollapseContext";
import { LinkButton } from "./Button";

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

/* Custom properties are inherited, so these cross the shadow boundary: pointing
   each hook at a role token lets the tree follow the theme with no React
   round-trip. Mapping table in DESIGN.md. */
const TREE_STYLE_BASE = {
  flex: 1,
  minHeight: 0,
  "--trees-bg-override": "transparent",
  "--trees-fg-override": "var(--color-text)",
  "--trees-theme-list-hover-bg": "var(--color-track)",
  "--trees-selected-bg-override": "var(--color-accent-tint)",
  "--trees-selected-fg-override": "var(--color-text)",
  "--trees-status-untracked-override": "var(--color-success)",
  "--trees-status-added-override": "var(--color-success)",
  "--trees-status-deleted-override": "var(--color-danger)",
  "--trees-status-modified-override": "var(--color-warning)",
  "--trees-status-renamed-override": "var(--color-renamed)",
  "--trees-padding-inline-override": "8px",
  "--trees-font-family-override": "var(--font-body)",
  // Fixed: the font-size control moves the code, not the chrome. See DESIGN.md.
  "--trees-font-size-override": "12px",
} as React.CSSProperties;

// Injected once into the shadow root via unsafeCSS (higher specificity than base layer).
const UNSAFE_CSS = `
  :host {
    /* The library ships "color-scheme: light dark", so its light-dark() calls
       follow the OS and ignore data-theme. Inheriting picks up :root's resolved
       scheme instead. */
    color-scheme: inherit;
  }

  /* --trees-bg is transparent here (see TREE_STYLE_BASE), so the truncation
     marker needs the page ground or it overlaps the clipped text. */
  [data-truncate-container] {
    --truncate-marker-background-color: var(--color-bg);
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
    background-color: var(--color-accent);
    color: var(--color-accent-fg);
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

function CollapseFooter() {
  const { totalFiles, collapsedCount, setAllCollapsed } = useCollapse();
  if (totalFiles === 0) return null;
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-t border-hair bg-panel text-[11px] text-muted">
      <span className="flex-1 truncate">
        {totalFiles} file{totalFiles !== 1 ? "s" : ""}
        {collapsedCount > 0 && ` · ${collapsedCount} collapsed`}
      </span>
      <LinkButton onClick={() => setAllCollapsed(true)} title="Collapse all files">
        Collapse all
      </LinkButton>
      <span className="text-faint">·</span>
      <LinkButton onClick={() => setAllCollapsed(false)} title="Expand all files">
        Expand all
      </LinkButton>
    </div>
  );
}

export default function FileTree({
  files,
  reviewFiles,
  selectedFile,
  onSelectFile,
}: FileTreeProps) {
  const reviewFilesRef = useRef(reviewFiles);
  reviewFilesRef.current = reviewFiles;

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

  // Sync git status. Derives only from the file list.
  const gitEntries = useMemo<GitStatusEntry[]>(
    () => files.map((f) => ({ path: f.name, status: FILE_TYPE_TO_GIT_STATUS[f.type] })),
    [files],
  );
  useEffect(() => {
    model.setGitStatus(gitEntries);
  }, [gitEntries, model]);

  // Refresh the comment-count decorations: `renderRowDecoration` reads from a
  // ref, so the tree must be told to re-render. `setComposition` is the only
  // public method that re-renders unconditionally, and round-tripping the
  // current composition changes no state.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reviewFiles is the change trigger; the decoration renderer reads it through a ref
  useEffect(() => {
    model.setComposition(model.getComposition());
  }, [reviewFiles, model]);

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
      <div className="p-2 border-b border-hair">
        <input
          type="text"
          placeholder="Filter files..."
          onChange={handleSearchChange}
          className="w-full px-2 py-1 text-[13px] bg-panel border border-hair rounded-md focus:outline-none focus:border-accent text-text placeholder-faint transition-colors"
        />
      </div>

      {/* Tree */}
      <PierreFileTree model={model} style={TREE_STYLE_BASE} />

      <CollapseFooter />
    </div>
  );
}
