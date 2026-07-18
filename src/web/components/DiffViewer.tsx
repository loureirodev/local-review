import type {
  CodeViewHandle,
  DiffLineAnnotation,
  FileDiffMetadata,
  LineAnnotation,
} from "@pierre/diffs/react";
import { CodeView, WorkerPoolContextProvider } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCollapse } from "../context/CollapseContext";
import { useReview } from "../context/ReviewContext";
import { useSettings } from "../hooks/useSettings";
import CommentDisplay from "./CommentDisplay";
import { type ActiveInput, CommentInputOverlay } from "./diff/CommentInputOverlay";
import { HIGHLIGHTER_OPTIONS, THEME, WORKER_POOL_OPTIONS } from "./diff/constants";
import type { CommentAnnotation } from "./diff/diffParsing";
import { EMPTY_COMMENTS } from "./diff/diffParsing";
import { FileCommentBadge, HeaderChevron, ViewedToggle } from "./diff/HeaderControls";
import { type DiffCodeViewItem, useCodeViewItems } from "./diff/useCodeViewItems";
import { useDiffData } from "./diff/useDiffData";
import FileCommentsDrawer from "./FileCommentsDrawer";

interface DiffViewerProps {
  patch: string;
  navigationTargetFile: string | null;
  reviewFiles: Record<string, FileReviewState>;
  onNavigationHandled: (filePath: string) => void;
  onAddComment: (comment: ReviewComment) => void;
  onDeleteComment: (filePath: string, commentId: string) => void;
  onUpdateComment: (filePath: string, commentId: string, body: string) => void;
}

const EMPTY_FILE_DIFFS: FileDiffMetadata[] = [];

// `getHoveredLine()` returns the file-mode shape (`{ lineNumber }`) or the
// diff-mode shape (`{ lineNumber, side }`); our items are always diffs, so
// `side` is present, but we keep it optional to match the union getter type.
type GutterHoverGetter = () => { lineNumber: number; side?: "additions" | "deletions" } | undefined;

function DiffViewerInner({
  patch,
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

  const { allFileDiffs, lineAnnotationsByFile, fileLevelCommentsByFile } = useDiffData(
    patch,
    reviewFiles,
  );

  const codeViewRef = useRef<CodeViewHandle<CommentAnnotation>>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  const { filesKey, initialItems, collectUpdatedItems } = useCodeViewItems({
    allFileDiffs: allFileDiffs ?? EMPTY_FILE_DIFFS,
    lineAnnotationsByFile,
    fileLevelCommentsByFile,
    reviewFiles,
    getIsCollapsed,
  });

  // Live data read by the header-metadata callback (viewed + file-level comment
  // count). Annotations live on the item itself, so they don't need a ref.
  const metaRef = useRef({ reviewFiles, fileLevelCommentsByFile });
  metaRef.current = { reviewFiles, fileLevelCommentsByFile };

  // Pending collapse anchor: when a file collapsed from above the viewport, its
  // shrink would shift the visible content up. Captured at toggle time and
  // applied after the collapse `updateItem` lands (in the bridge effect).
  const pendingAnchorRef = useRef<{ id: string; itemTop: number } | null>(null);

  const [activeInput, setActiveInput] = useState<ActiveInput | null>(null);
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

  const handleToggleCollapsed = useCallback(
    (filePath: string) => {
      // Capture the item's top vs the current scroll position before toggling.
      // If it sits above the viewport, the bridge effect re-anchors after the
      // collapse applies so the reader's position doesn't jump.
      const instance = codeViewRef.current?.getInstance();
      const itemTop = instance?.getTopForItem(filePath);
      const scrollTop = instance?.getScrollTop();
      pendingAnchorRef.current =
        itemTop != null && scrollTop != null && itemTop < scrollTop
          ? { id: filePath, itemTop }
          : null;
      toggleFile(filePath);
    },
    [toggleFile],
  );

  // State→viewer bridge (D2): when review state or collapse state changes,
  // re-emit only the items whose render signature changed via `updateItem`.
  // Covers comments, viewed, per-file collapse, and collapse-all/expand-all.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reviewFiles/getIsCollapsed are the change triggers read through refs in collectUpdatedItems
  useEffect(() => {
    const ref = codeViewRef.current;
    if (!ref) return;
    for (const item of collectUpdatedItems()) {
      ref.updateItem(item);
    }
    // Re-anchor after a collapse so a file shrinking above the viewport doesn't
    // shift the reader's position. Done here, once the collapse `updateItem` has
    // been applied, against the item's pre-toggle top.
    const anchor = pendingAnchorRef.current;
    if (anchor) {
      pendingAnchorRef.current = null;
      ref.scrollTo({ type: "item", id: anchor.id, align: "start", behavior: "instant" });
    }
  }, [reviewFiles, getIsCollapsed, collectUpdatedItems]);

  // Navigation: scroll to the target file's section and highlight it visually.
  useEffect(() => {
    if (!navigationTargetFile) return;
    codeViewRef.current?.scrollTo({
      type: "item",
      id: navigationTargetFile,
      align: "start",
      behavior: "smooth",
    });
    onNavigationHandled(navigationTargetFile);
  }, [navigationTargetFile, onNavigationHandled]);

  // Highlight the currently navigated file with a background color.
  useEffect(() => {
    if (!styleRef.current) {
      styleRef.current = document.createElement("style");
      styleRef.current.setAttribute("data-selected-file-css", "");
      document.head.appendChild(styleRef.current);
    }
    if (navigationTargetFile) {
      const escaped = navigationTargetFile.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
      styleRef.current.textContent = `
        diffs-container[data-file-id="${escaped}"] {
          background-color: rgba(59, 130, 246, 0.05);
        }
      `;
    } else {
      styleRef.current.textContent = "";
    }
  }, [navigationTargetFile]);

  const renderAnnotation = useCallback(
    (
      annotation: LineAnnotation<CommentAnnotation> | DiffLineAnnotation<CommentAnnotation>,
      _item: DiffCodeViewItem,
    ) => {
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

  const renderHeaderPrefix = useCallback(
    (item: DiffCodeViewItem) => (
      <HeaderChevron
        collapsed={item.collapsed ?? false}
        onClick={() => handleToggleCollapsed(item.id)}
      />
    ),
    [handleToggleCollapsed],
  );

  const renderHeaderMetadata = useCallback(
    (item: DiffCodeViewItem) => {
      const filePath = item.id;
      const { reviewFiles: review, fileLevelCommentsByFile: fileMap } = metaRef.current;
      const commentCount = fileMap.get(filePath)?.length ?? 0;
      const viewed = review[filePath]?.viewed ?? false;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <FileCommentBadge
            count={commentCount}
            onClick={() => openDrawer(filePath, commentCount === 0)}
          />
          <ViewedToggle viewed={viewed} onClick={() => toggleViewed(filePath)} />
        </span>
      );
    },
    [openDrawer, toggleViewed],
  );

  const renderGutterUtility = useCallback(
    (getHoveredLine: GutterHoverGetter, item: DiffCodeViewItem) => (
      <button
        type="button"
        onClick={() => {
          const hovered = getHoveredLine();
          if (!hovered) return;
          requestLineComment(
            item.id,
            hovered.lineNumber,
            hovered.side === "deletions" ? "deletion" : "addition",
          );
        }}
        className="absolute -left-2 top-1/2 -translate-y-1/2 size-6 bg-neutral-700/90 hover:bg-neutral-600 text-neutral-300 hover:text-neutral-100 rounded-full flex items-center justify-center text-lg shadow-lg shadow-black/30 z-10 transition-colors border border-neutral-600/50"
        title="Add comment"
      >
        +
      </button>
    ),
    [requestLineComment],
  );

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

  return (
    <>
      <CodeView<CommentAnnotation>
        key={filesKey}
        ref={codeViewRef}
        initialItems={initialItems}
        // CodeView.setup() attaches its scroll listener to this root but does
        // not set overflow itself — the host must make the root scrollable.
        // Containment (contain:strict on the root + layout/paint/style on each
        // diffs-container) keeps paint work bounded while scrolling large diffs.
        // No will-change:scroll-position — promoting the scroller to its own
        // layer makes the sticky header snap to device pixels (a 1–2px jump when
        // it anchors); contain:strict already bounds the scroll work.
        className="h-full min-h-0 overflow-y-auto overflow-x-clip overscroll-contain [contain:strict] [overflow-anchor:none] [&_diffs-container]:overflow-clip [&_diffs-container]:[contain:layout_paint_style]"
        renderAnnotation={renderAnnotation}
        renderHeaderPrefix={renderHeaderPrefix}
        renderHeaderMetadata={renderHeaderMetadata}
        renderGutterUtility={renderGutterUtility}
        options={{
          theme: THEME,
          themeType: "dark",
          diffStyle,
          lineDiffType: "word",
          overflow: wrapLines ? "wrap" : "scroll",
          disableLineNumbers: !showLineNumbers,
          enableGutterUtility: true,
          stickyHeaders: true,
          // Keep height estimation accurate when the user changes line-height
          // (rendered row height = --diffs-line-height below). Without this the
          // estimator uses the library default (20px) → drifting scrollbar and
          // jumpy scrollTo to far, not-yet-measured files.
          itemMetrics: { lineHeight },
          layout: { paddingTop: 0, paddingBottom: 0, gap: 0 },
          unsafeCSS: `
            :host {
              --diffs-font-size: ${fontSize}px;
              --diffs-line-height: ${lineHeight}px;
              --diffs-font-family: var(--font-mono);
              --diffs-header-font-family: var(--font-mono);
            }
            /* Default is "overflow: scroll clip", which always shows the
               horizontal scrollbar even when content fits or wrap is enabled.
               Override: hidden when wrapping (no scroll possible), auto when
               not (only when content actually overflows). */
            [data-code] {
              overflow-x: ${wrapLines ? "hidden" : "auto"} !important;
            }
          `,
        }}
      />

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
        <CommentInputOverlay
          activeInput={activeInput}
          onSubmit={handleAddComment}
          onCancel={() => setActiveInput(null)}
        />
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
