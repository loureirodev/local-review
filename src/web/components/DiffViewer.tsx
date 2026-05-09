import { parsePatchFiles } from "@pierre/diffs";
import type { DiffLineAnnotation, FileDiffMetadata } from "@pierre/diffs/react";
import { FileDiff, WorkerPoolContextProvider } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCollapse } from "../context/CollapseContext.js";
import { useReview } from "../context/ReviewContext.js";
import { useSettings } from "../hooks/useSettings.js";
import CommentDisplay from "./CommentDisplay.js";
import CommentInput from "./CommentInput.js";
import { getFileSectionId } from "./diffNavigation.js";
import FileCommentsDrawer from "./FileCommentsDrawer.js";
import { compareByTreeOrder } from "./FileTree.js";

// @pierre/diffs header is min-height: calc(1lh + gap-block * 3) with default
// gap-block of 8px. We pass lineHeight from settings.
const HEADER_GAP = 24;
const MAX_ESTIMATED_LINES = 200;

function computeHeaderHeight(lineHeight: number): number {
  return lineHeight + HEADER_GAP;
}

const THEME = { dark: "github-dark", light: "github-light" } as const;

function workerFactory(): Worker {
  return new Worker(new URL("@pierre/diffs/worker/worker.js", import.meta.url), {
    type: "module",
  });
}

const WORKER_POOL_OPTIONS = { workerFactory, poolSize: 4 } as const;
const HIGHLIGHTER_OPTIONS = { theme: THEME, lineDiffType: "word" as const };

interface FileDiffSummary {
  lines: number;
  additions: number;
  deletions: number;
}

function summarizeFileDiff(fileDiff: FileDiffMetadata): FileDiffSummary {
  let lines = 0;
  let additions = 0;
  let deletions = 0;
  for (const hunk of fileDiff.hunks) {
    for (const content of hunk.hunkContent) {
      if (content.type === "context") {
        lines += content.lines;
      } else {
        lines += content.deletions + content.additions;
        additions += content.additions;
        deletions += content.deletions;
      }
    }
  }
  return { lines, additions, deletions };
}

interface CommentAnnotation {
  comments: ReviewComment[];
}

const EMPTY_ANNOTATIONS: DiffLineAnnotation<CommentAnnotation>[] = [];
const EMPTY_COMMENTS: ReviewComment[] = [];

type HoverUtilityRenderer = (
  getHoveredLine: () => { lineNumber: number; side: string } | undefined,
) => React.ReactNode;

/** Extract the set of visible line numbers per side from a parsed file diff. */
function getVisibleLines(fileDiff: FileDiffMetadata): {
  additions: Set<number>;
  deletions: Set<number>;
} {
  const additions = new Set<number>();
  const deletions = new Set<number>();

  for (const hunk of fileDiff.hunks) {
    let addLine = hunk.additionStart;
    let delLine = hunk.deletionStart;

    for (const content of hunk.hunkContent) {
      if (content.type === "context") {
        for (let i = 0; i < content.lines; i++) {
          additions.add(addLine++);
          deletions.add(delLine++);
        }
      } else {
        for (let i = 0; i < content.deletions; i++) {
          deletions.add(delLine++);
        }
        for (let i = 0; i < content.additions; i++) {
          additions.add(addLine++);
        }
      }
    }
  }

  return { additions, deletions };
}

function HeaderChevron({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  // Inline styles because this button renders inside FileDiff's shadow DOM via renderHeaderPrefix.
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? "Expand file" : "Collapse file"}
      aria-label={collapsed ? "Expand file" : "Collapse file"}
      aria-pressed={collapsed}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "20px",
        height: "20px",
        marginLeft: "-4px",
        marginRight: "2px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "#737373",
        borderRadius: "4px",
        flexShrink: 0,
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{
          transition: "transform 150ms",
          transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
        }}
      >
        <path d="M4 2l4 4-4 4" />
      </svg>
    </button>
  );
}

function ViewedToggle({ viewed, onClick }: { viewed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={viewed}
      title={viewed ? "Mark as not viewed" : "Mark as viewed"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "1px 8px 1px 6px",
        fontSize: "11px",
        fontFamily: "monospace",
        background: viewed ? "rgba(34, 197, 94, 0.15)" : "rgba(64, 64, 64, 0.4)",
        border: `1px solid ${viewed ? "rgba(34, 197, 94, 0.4)" : "rgba(82, 82, 82, 0.4)"}`,
        borderRadius: "4px",
        color: viewed ? "#86efac" : "#737373",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "12px",
          height: "12px",
          borderRadius: "999px",
          background: viewed ? "rgba(34, 197, 94, 0.25)" : "transparent",
          border: viewed ? "none" : "1px solid currentColor",
        }}
      >
        {viewed ? (
          <svg
            width="9"
            height="9"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2.5 6l2.5 2.5 4.5-4.5" />
          </svg>
        ) : null}
      </span>
      Viewed
    </button>
  );
}

interface FloatingFileIndicatorProps {
  fileDiff: FileDiffMetadata;
  additions: number;
  deletions: number;
  state: "open" | "closed";
}

function FloatingFileIndicator({
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

interface FileDiffSectionProps {
  fileDiff: FileDiffMetadata;
  filePath: string;
  isSelected: boolean;
  isCollapsed: boolean;
  isViewed: boolean;
  fileComments: ReviewComment[];
  diffStyle: "split" | "unified";
  wrapLines: boolean;
  showLineNumbers: boolean;
  fontSize: number;
  lineHeight: number;
  lineAnnotations: DiffLineAnnotation<CommentAnnotation>[];
  renderAnnotation: (annotation: DiffLineAnnotation<CommentAnnotation>) => React.ReactNode;
  onToggleCollapse: (filePath: string) => void;
  onToggleViewed: (filePath: string) => void;
  onRequestLineComment: (filePath: string, line: number, side: "addition" | "deletion") => void;
  onOpenDrawer: (filePath: string, showInput: boolean) => void;
}

const FileDiffSection = memo(function FileDiffSection({
  fileDiff,
  filePath,
  isSelected,
  isCollapsed,
  isViewed,
  fileComments,
  diffStyle,
  wrapLines,
  showLineNumbers,
  fontSize,
  lineHeight,
  lineAnnotations,
  renderAnnotation,
  onToggleCollapse,
  onToggleViewed,
  onRequestLineComment,
  onOpenDrawer,
}: FileDiffSectionProps) {
  const sectionId = getFileSectionId(filePath);

  const handleToggleCollapse = useCallback(() => {
    onToggleCollapse(filePath);
  }, [filePath, onToggleCollapse]);

  const handleToggleViewed = useCallback(() => {
    onToggleViewed(filePath);
  }, [filePath, onToggleViewed]);

  const renderHoverUtility = useCallback<HoverUtilityRenderer>(
    (getHoveredLine) => (
      <button
        type="button"
        onClick={() => {
          const hovered = getHoveredLine();
          if (!hovered) return;
          onRequestLineComment(
            filePath,
            hovered.lineNumber,
            hovered.side === "deletions" ? "deletion" : "addition",
          );
        }}
        className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-neutral-700/90 hover:bg-neutral-600 text-neutral-300 hover:text-neutral-100 rounded-full flex items-center justify-center text-lg shadow-lg shadow-black/30 z-10 transition-colors border border-neutral-600/50"
        title="Add comment"
      >
        +
      </button>
    ),
    [filePath, onRequestLineComment],
  );

  const renderHeaderPrefix = useCallback(
    () => <HeaderChevron collapsed={isCollapsed} onClick={handleToggleCollapse} />,
    [isCollapsed, handleToggleCollapse],
  );

  const commentCount = fileComments.length;
  const renderHeaderMetadata = useCallback(
    () => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <FileCommentBadge
          count={commentCount}
          onClick={() => onOpenDrawer(filePath, commentCount === 0)}
        />
        <ViewedToggle viewed={isViewed} onClick={handleToggleViewed} />
      </span>
    ),
    [commentCount, filePath, isViewed, onOpenDrawer, handleToggleViewed],
  );

  return (
    <section
      id={sectionId}
      data-file-path={filePath}
      className={`border-b border-neutral-800/70 ${isSelected ? "bg-blue-500/5" : ""}`}
    >
      <FileDiff
        fileDiff={fileDiff}
        options={{
          diffStyle,
          theme: THEME,
          themeType: "dark",
          lineDiffType: "word",
          overflow: wrapLines ? "wrap" : "scroll",
          disableLineNumbers: !showLineNumbers,
          expandUnchanged: true,
          enableHoverUtility: true,
          collapsed: isCollapsed,
          disableVirtualizationBuffers: true,
          unsafeCSS: `
            :host {
              --diffs-font-size: ${fontSize}px;
              --diffs-line-height: ${lineHeight}px;
            }
          `,
        }}
        lineAnnotations={lineAnnotations}
        renderAnnotation={renderAnnotation}
        renderHoverUtility={renderHoverUtility}
        renderHeaderPrefix={renderHeaderPrefix}
        renderHeaderMetadata={renderHeaderMetadata}
      />
    </section>
  );
});

function FileCommentBadge({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "1px 6px",
        fontSize: "11px",
        fontFamily: "monospace",
        background: count > 0 ? "rgba(64, 64, 64, 0.6)" : "rgba(64, 64, 64, 0.4)",
        border: `1px solid ${count > 0 ? "rgba(82, 82, 82, 0.5)" : "rgba(82, 82, 82, 0.4)"}`,
        borderRadius: "4px",
        color: count > 0 ? "#a3a3a3" : "#737373",
        cursor: "pointer",
      }}
      title={
        count > 0 ? `${count} file-level comment${count !== 1 ? "s" : ""}` : "Add file comment"
      }
    >
      <svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5l-3 3V3z" />
      </svg>
      {count > 0 ? count : "+"}
    </button>
  );
}

interface DiffViewerProps {
  patch: string;
  selectedFile: string | null;
  navigationTargetFile: string | null;
  reviewFiles: Record<string, FileReviewState>;
  onNavigationHandled: (filePath: string) => void;
  onAddComment: (comment: ReviewComment) => void;
  onDeleteComment: (filePath: string, commentId: string) => void;
  onUpdateComment: (filePath: string, commentId: string, body: string) => void;
}

interface ActiveInput {
  filePath: string;
  line: number | null;
  side: "addition" | "deletion" | null;
}

function DiffViewerInner({
  patch,
  selectedFile,
  navigationTargetFile,
  reviewFiles,
  onNavigationHandled,
  onAddComment,
  onDeleteComment,
  onUpdateComment,
}: DiffViewerProps) {
  const {
    state: { diffStyle, wrapLines, showLineNumbers, fontSize, lineHeight },
  } = useSettings();
  const {
    state: { source },
    toggleViewed,
  } = useReview();
  const { getIsCollapsed, toggleFile } = useCollapse();
  const [activeInput, setActiveInput] = useState<ActiveInput | null>(null);

  const allFileDiffs = useMemo(() => {
    if (!patch) return null;
    try {
      const parsed = parsePatchFiles(patch);
      return parsed
        .flatMap((parsedPatch) => parsedPatch.files)
        .sort((a, b) => compareByTreeOrder(a.name, b.name));
    } catch {
      return null;
    }
  }, [patch]);

  const visibleLinesByFile = useMemo(() => {
    const map = new Map<string, { additions: Set<number>; deletions: Set<number> }>();
    if (!allFileDiffs) return map;
    for (const fd of allFileDiffs) {
      map.set(fd.name, getVisibleLines(fd));
    }
    return map;
  }, [allFileDiffs]);

  const lineAnnotationsByFile = useMemo(() => {
    const annotations = new Map<string, DiffLineAnnotation<CommentAnnotation>[]>();

    for (const [filePath, fileReview] of Object.entries(reviewFiles)) {
      const visible = visibleLinesByFile.get(filePath);
      const fileAnnotations: DiffLineAnnotation<CommentAnnotation>[] = [];
      for (const comment of fileReview.comments) {
        if (comment.line !== null) {
          const side = comment.side === "deletion" ? "deletions" : "additions";
          const lineSet = side === "deletions" ? visible?.deletions : visible?.additions;
          if (!lineSet || lineSet.has(comment.line)) {
            fileAnnotations.push({
              side,
              lineNumber: comment.line,
              metadata: { comments: [comment] },
            });
          }
        }
      }
      annotations.set(filePath, fileAnnotations);
    }

    return annotations;
  }, [reviewFiles, visibleLinesByFile]);

  const fileLevelCommentsByFile = useMemo(() => {
    const map = new Map<string, ReviewComment[]>();

    for (const [filePath, fileReview] of Object.entries(reviewFiles)) {
      const visible = visibleLinesByFile.get(filePath);
      const fileComments: ReviewComment[] = [];

      for (const comment of fileReview.comments) {
        if (comment.line === null) {
          fileComments.push(comment);
        } else if (visible) {
          const lineSet = comment.side === "deletion" ? visible.deletions : visible.additions;
          if (!lineSet.has(comment.line)) {
            fileComments.push(comment);
          }
        }
      }

      if (fileComments.length > 0) {
        map.set(filePath, fileComments);
      }
    }

    return map;
  }, [reviewFiles, visibleLinesByFile]);

  const [drawerState, setDrawerState] = useState<{
    filePath: string;
    showInput: boolean;
  } | null>(null);

  const handleAddComment = useCallback(
    (comment: ReviewComment) => {
      onAddComment(comment);
      setActiveInput(null);
    },
    [onAddComment],
  );

  const renderAnnotation = useCallback(
    (annotation: DiffLineAnnotation<CommentAnnotation>) => {
      if (!annotation.metadata) return null;
      return (
        <div className="border-t border-neutral-800/40">
          {annotation.metadata.comments.map((comment) => (
            <CommentDisplay
              key={comment.id}
              comment={comment}
              source={source}
              onDelete={(id) => onDeleteComment(comment.filePath, id)}
              onUpdate={(id, body) => onUpdateComment(comment.filePath, id, body)}
            />
          ))}
        </div>
      );
    },
    [source, onDeleteComment, onUpdateComment],
  );

  const openDrawer = useCallback((filePath: string, showInput = false) => {
    setDrawerState({ filePath, showInput });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerState(null);
  }, []);

  const requestLineComment = useCallback(
    (filePath: string, line: number, side: "addition" | "deletion") => {
      setActiveInput({ filePath, line, side });
    },
    [],
  );

  const handleToggleFile = useCallback((filePath: string) => toggleFile(filePath), [toggleFile]);
  const handleToggleViewed = useCallback(
    (filePath: string) => toggleViewed(filePath),
    [toggleViewed],
  );

  const summaryByFile = useMemo(() => {
    const map = new Map<string, FileDiffSummary>();
    if (!allFileDiffs) return map;
    for (const fd of allFileDiffs) {
      map.set(fd.name, summarizeFileDiff(fd));
    }
    return map;
  }, [allFileDiffs]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const headerHeight = computeHeaderHeight(lineHeight);

  const virtualizer = useVirtualizer({
    count: allFileDiffs?.length ?? 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      if (!allFileDiffs) return headerHeight;
      const fileDiff = allFileDiffs[index];
      if (getIsCollapsed(fileDiff.name)) {
        return headerHeight;
      }
      const summary = summaryByFile.get(fileDiff.name);
      const lines = summary ? Math.min(summary.lines, MAX_ESTIMATED_LINES) : 0;
      return headerHeight + lines * lineHeight;
    },
    overscan: 3,
  });

  // Force re-estimation when collapse state or header height changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: getIsCollapsed is the trigger
  useEffect(() => {
    virtualizer.measure();
  }, [getIsCollapsed, headerHeight, virtualizer]);

  // Navigation: scroll to target then re-scroll until the item's measured
  // position is stable. estimateSize is approximate (Shiki renders async), so
  // a single scrollToIndex call lands at the wrong offset — measurement shifts
  // the item afterward. Loop in rAF until scrollTop matches item.start.
  useEffect(() => {
    if (!navigationTargetFile || !allFileDiffs) return;

    const fileIndex = allFileDiffs.findIndex((fd) => fd.name === navigationTargetFile);
    if (fileIndex === -1) {
      onNavigationHandled(navigationTargetFile);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    const settle = () => {
      if (cancelled) return;
      attempts++;
      virtualizer.scrollToIndex(fileIndex, { align: "start" });

      requestAnimationFrame(() => {
        if (cancelled) return;
        const el = scrollRef.current;
        const items = virtualizer.getVirtualItems();
        const target = items.find((i) => i.index === fileIndex);

        if (!el || !target) {
          if (attempts >= MAX_ATTEMPTS) {
            onNavigationHandled(navigationTargetFile);
            return;
          }
          settle();
          return;
        }

        const delta = Math.abs(el.scrollTop - target.start);
        if (delta < 2 || attempts >= MAX_ATTEMPTS) {
          onNavigationHandled(navigationTargetFile);
          return;
        }
        settle();
      });
    };

    settle();

    return () => {
      cancelled = true;
    };
  }, [navigationTargetFile, allFileDiffs, virtualizer, onNavigationHandled]);

  // Pinned header: detect which expanded file's header has scrolled out of view
  // while its body still extends below. Only fires when pinned file changes —
  // not on every scroll frame — so it stays cheap.
  const [pinnedFile, setPinnedFile] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  // Delayed-unmount mirror so the indicator can run its exit animation when
  // pinnedFile becomes null. While pinnedFile === displayedPinnedFile we're
  // open; when pinnedFile flips to null we keep displayedPinnedFile populated
  // for one animation duration, then clear it.
  const [displayedPinnedFile, setDisplayedPinnedFile] = useState<string | null>(null);
  useEffect(() => {
    if (pinnedFile) {
      setDisplayedPinnedFile(pinnedFile);
      return;
    }
    if (displayedPinnedFile === null) return;
    const t = setTimeout(() => setDisplayedPinnedFile(null), 150);
    return () => clearTimeout(t);
  }, [pinnedFile, displayedPinnedFile]);

  // virtualizer + getIsCollapsed accessed via closure (always current);
  // re-binding the listener on every collapse change would be wasteful.
  // biome-ignore lint/correctness/useExhaustiveDependencies: closure is intentional
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !allFileDiffs || allFileDiffs.length === 0) return;

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const scrollTop = el.scrollTop;

        // Show the floating indicator only when the active expanded file's
        // header has fully scrolled out of view (and the body still extends
        // past it). This way the indicator is a clearly distinct UI hint, not
        // a fake replacement of the real header.
        let found: string | null = null;
        for (const item of virtualizer.getVirtualItems()) {
          if (item.start <= scrollTop && scrollTop < item.start + item.size) {
            const fileDiff = allFileDiffs[item.index];
            if (fileDiff && !getIsCollapsed(fileDiff.name)) {
              const headerBottom = item.start + headerHeight;
              if (headerBottom <= scrollTop && item.start + item.size > scrollTop + headerHeight) {
                found = fileDiff.name;
              }
            }
            break;
          }
        }

        setPinnedFile((current) => (current === found ? current : found));
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [allFileDiffs, headerHeight]);

  if (!patch || !allFileDiffs || allFileDiffs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        <div className="text-center">
          <p className="text-lg">No changes found</p>
          <p className="text-sm mt-1">Try a different diff mode</p>
        </div>
      </div>
    );
  }

  const drawerComments = drawerState
    ? (fileLevelCommentsByFile.get(drawerState.filePath) ?? EMPTY_COMMENTS)
    : EMPTY_COMMENTS;

  const displayedFile = displayedPinnedFile
    ? (allFileDiffs.find((fd) => fd.name === displayedPinnedFile) ?? null)
    : null;
  const displayedSummary = displayedFile ? summaryByFile.get(displayedFile.name) : undefined;

  return (
    <>
      <div ref={scrollRef} className="relative h-full overflow-auto">
        {displayedFile && (
          <FloatingFileIndicator
            key={displayedFile.name}
            fileDiff={displayedFile}
            additions={displayedSummary?.additions ?? 0}
            deletions={displayedSummary?.deletions ?? 0}
            state={pinnedFile === displayedFile.name ? "open" : "closed"}
          />
        )}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const fileDiff = allFileDiffs[item.index];
            const fileComments = fileLevelCommentsByFile.get(fileDiff.name) ?? EMPTY_COMMENTS;

            return (
              <div
                key={fileDiff.name}
                ref={virtualizer.measureElement}
                data-index={item.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <FileDiffSection
                  fileDiff={fileDiff}
                  filePath={fileDiff.name}
                  isSelected={selectedFile === fileDiff.name}
                  isCollapsed={getIsCollapsed(fileDiff.name)}
                  isViewed={reviewFiles[fileDiff.name]?.viewed ?? false}
                  fileComments={fileComments}
                  diffStyle={diffStyle}
                  wrapLines={wrapLines}
                  showLineNumbers={showLineNumbers}
                  fontSize={fontSize}
                  lineHeight={lineHeight}
                  lineAnnotations={lineAnnotationsByFile.get(fileDiff.name) ?? EMPTY_ANNOTATIONS}
                  renderAnnotation={renderAnnotation}
                  onToggleCollapse={handleToggleFile}
                  onToggleViewed={handleToggleViewed}
                  onRequestLineComment={requestLineComment}
                  onOpenDrawer={openDrawer}
                />
              </div>
            );
          })}
        </div>
      </div>

      <FileCommentsDrawer
        filePath={drawerState?.filePath ?? null}
        comments={drawerComments}
        source={source}
        showInput={drawerState?.showInput ?? false}
        onClose={closeDrawer}
        onAddComment={onAddComment}
        onDeleteComment={onDeleteComment}
        onUpdateComment={onUpdateComment}
      />

      {activeInput && (
        <div className="fixed bottom-4 right-4 w-96 z-50 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-500 px-2.5 py-1.5 bg-neutral-900 border border-neutral-800/60 border-b-0 rounded-t-md">
            <span className="text-neutral-400">{activeInput.filePath.split("/").pop()}</span>
            {activeInput.line !== null ? (
              <>
                <span className="text-neutral-700">:</span>
                <span className="text-neutral-500">L{activeInput.line}</span>
                <span className="text-neutral-700">&middot;</span>
                <span className="text-neutral-600">{activeInput.side}</span>
              </>
            ) : (
              <>
                <span className="text-neutral-700">&middot;</span>
                <span className="text-neutral-600">File comment</span>
              </>
            )}
          </div>
          <CommentInput
            filePath={activeInput.filePath}
            line={activeInput.line}
            side={activeInput.side}
            onSubmit={handleAddComment}
            onCancel={() => setActiveInput(null)}
          />
        </div>
      )}
    </>
  );
}

export default function DiffViewer(props: DiffViewerProps) {
  return (
    <WorkerPoolContextProvider
      poolOptions={WORKER_POOL_OPTIONS}
      highlighterOptions={HIGHLIGHTER_OPTIONS}
    >
      <DiffViewerInner {...props} />
    </WorkerPoolContextProvider>
  );
}
