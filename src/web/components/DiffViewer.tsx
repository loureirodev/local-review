import type {
  CodeViewHandle,
  DiffLineAnnotation,
  LineAnnotation,
  PostRenderPhase,
} from "@pierre/diffs/react";
import { CodeView, WorkerPoolContextProvider } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCollapse } from "../context/CollapseContext";
import { useReview } from "../context/ReviewContext";
import { useSettings } from "../hooks/useSettings";
import { useTheme } from "../hooks/useTheme";
import CommentDisplay from "./CommentDisplay";
import { type ActiveInput, CommentInputOverlay } from "./diff/CommentInputOverlay";
import { HIGHLIGHTER_OPTIONS, THEME, WORKER_POOL_OPTIONS } from "./diff/constants";
import type { CommentAnnotation, FolderFileState, ViewerEntry } from "./diff/diffParsing";
import { EMPTY_COMMENTS } from "./diff/diffParsing";
import {
  AddCommentButton,
  FileCommentBadge,
  HeaderChevron,
  MarkdownViewToggle,
  ViewedToggle,
} from "./diff/HeaderControls";
import { type DiffCodeViewItem, useCodeViewItems } from "./diff/useCodeViewItems";
import { useDiffData } from "./diff/useDiffData";
import { useFolderData } from "./diff/useFolderData";
import FileCommentsDrawer from "./FileCommentsDrawer";
import { useMarkdownPreview } from "./markdown/useMarkdownPreview";

const MarkdownPreview = lazy(() => import("./markdown/MarkdownPreview"));

/** What the viewer shows: a git patch, or the files of a folder (folder mode),
 *  whose contents are requested through `onLoadFile` as files expand. */
export type ViewerContent =
  | { kind: "diff"; patch: string }
  | {
      kind: "folder";
      paths: string[];
      files: Record<string, FolderFileState>;
      /** `priority` puts the file ahead of those queued (e.g. by "expand all"). */
      onLoadFile: (path: string, priority?: boolean) => void;
    };

interface DiffViewerProps {
  content: ViewerContent;
  /** Identity of the diff being viewed (mode + branches). Changing it remounts
   *  the viewer, resetting the scroll — switching to a different diff should
   *  start at the top. Changes to the *contents* of the same diff keep the key
   *  and are reconciled in place, preserving the reader's position (D8). */
  diffKey: string;
  navigationTargetFile: string | null;
  reviewFiles: Record<string, FileReviewState>;
  onNavigationHandled: (filePath: string) => void;
  onAddComment: (comment: ReviewComment) => void;
  onDeleteComment: (filePath: string, commentId: string) => void;
  onUpdateComment: (filePath: string, commentId: string, body: string) => void;
}

const EMPTY_PATHS: string[] = [];
const EMPTY_FOLDER_FILES: Record<string, FolderFileState> = {};

/** Stable across renders on purpose — see `codeViewOptions`. */
const CODE_VIEW_LAYOUT = { paddingTop: 0, paddingBottom: 0, gap: 0 } as const;

/** Chrome keeps a fixed size while the font-size control moves the code. */
const HEADER_FONT_SIZE = 12;
const HEADER_LINE_HEIGHT = 20;

/** How long the flash tint takes to fade, once the target section is on screen. */
const NAVIGATION_FLASH_MS = 1400;
/** When the flash rule is dropped. Must outlast a smooth scroll plus the fade;
 *  the visible timing is the CSS animation's, not this. */
const NAVIGATION_FLASH_CLEANUP_MS = 5000;

// `getHoveredLine()` returns the file-mode shape (`{ lineNumber }`) for folder
// items or the diff-mode shape (`{ lineNumber, side }`) for diff items.
type GutterHoverGetter = () => { lineNumber: number; side?: "additions" | "deletions" } | undefined;

/** An item standing in for a markdown file shown as its rendered preview. */
function isPreviewItem(item: DiffCodeViewItem): boolean {
  return item.annotations?.[0]?.metadata?.preview != null;
}

function DiffViewerInner({
  content,
  diffKey,
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
  const folder = content.kind === "folder" ? content : null;
  // `CodeView` takes its theme as a JavaScript value, not a selector, so unlike
  // the file tree it cannot follow `data-theme` on its own.
  const { theme } = useTheme();

  // Both hooks run every render (hooks can't be conditional); the idle one
  // gets empty input.
  const diffData = useDiffData(content.kind === "diff" ? content.patch : "", reviewFiles);
  const folderData = useFolderData(
    folder?.paths ?? EMPTY_PATHS,
    folder?.files ?? EMPTY_FOLDER_FILES,
    reviewFiles,
  );
  const diffEntries = useMemo<ViewerEntry[]>(
    () => (diffData.allFileDiffs ?? []).map((fileDiff) => ({ type: "diff", fileDiff })),
    [diffData.allFileDiffs],
  );
  const { entries, lineAnnotationsByFile, fileLevelCommentsByFile } = folder
    ? folderData
    : { ...diffData, entries: diffEntries };

  // Folder markdown files shown rendered (diffs always show code).
  const { previewable, sourceFiles, setPreview, getPreview } = useMarkdownPreview(entries);

  const codeViewRef = useRef<CodeViewHandle<CommentAnnotation>>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  const { filesKey, initialItems, collectUpdatedItems, buildAllItems } = useCodeViewItems({
    entries,
    lineAnnotationsByFile,
    fileLevelCommentsByFile,
    reviewFiles,
    getIsCollapsed,
    getPreview,
  });

  // Live data for the header-metadata callback; annotations live on the item itself.
  const metaRef = useRef({ reviewFiles, fileLevelCommentsByFile, previewable, sourceFiles });
  metaRef.current = { reviewFiles, fileLevelCommentsByFile, previewable, sourceFiles };

  // Pending collapse anchor: when a file collapsed from above the viewport, its
  // shrink would shift the visible content up. Captured at toggle time and
  // applied after the collapse `updateItem` lands (in the bridge effect).
  const pendingAnchorRef = useRef<{ id: string; itemTop: number } | null>(null);

  const [flashedFile, setFlashedFile] = useState<string | null>(null);
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
    (filePath: string, line: number, side: "addition" | "deletion" | null) => {
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

  // File-set reconcile (D8): adding, removing or reordering files can't be
  // expressed as a targeted `updateItem` pass, so hand CodeView the full
  // ordered list. `setItems` reconciles by id — records for surviving files are
  // reused with their measured height, and it anchors the scroll on a surviving
  // item, so the reader keeps their position instead of being thrown to the top
  // by a remount. Reached through `getInstance()`: the React handle exposes
  // `removeItem`/`addItems` but not `setItems`, and `addItems` only appends,
  // which would misplace a new file that belongs in the middle of tree order.
  //
  // Declared before the bridge effect so it runs first; the bridge then finds
  // no stale signatures and no-ops.
  const lastReconcileRef = useRef({ diffKey, filesKey });
  useEffect(() => {
    const last = lastReconcileRef.current;
    // A new `diffKey` remounts CodeView, which re-seeds from `initialItems` —
    // nothing to reconcile, just adopt the new file set as the baseline.
    if (last.diffKey !== diffKey) {
      lastReconcileRef.current = { diffKey, filesKey };
      return;
    }
    if (last.filesKey === filesKey) return;
    const instance = codeViewRef.current?.getInstance();
    // No instance yet: leave the baseline untouched so a later run retries.
    if (!instance) return;
    lastReconcileRef.current = { diffKey, filesKey };
    instance.setItems(buildAllItems());
  }, [diffKey, filesKey, buildAllItems]);

  // State→viewer bridge (D2): re-emit via `updateItem` only the items whose render
  // signature changed (comments, viewed, collapse, folder files once fetched).
  // biome-ignore lint/correctness/useExhaustiveDependencies: reviewFiles/getIsCollapsed/getPreview/entries are the change triggers read through refs in collectUpdatedItems
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
  }, [reviewFiles, getIsCollapsed, getPreview, entries, collectUpdatedItems]);

  // Folder mode: fetch a file when its section is expanded. `onLoadFile` dedupes,
  // so this depends on collapse state only, not on each finished load.
  const folderPaths = folder?.paths;
  const onLoadFile = folder?.onLoadFile;
  useEffect(() => {
    if (!folderPaths || !onLoadFile) return;
    for (const path of folderPaths) {
      if (!getIsCollapsed(path)) onLoadFile(path);
    }
  }, [folderPaths, onLoadFile, getIsCollapsed]);

  // Navigation: scroll to the target file's section and flash it.
  useEffect(() => {
    if (!navigationTargetFile) return;
    // Folder files start collapsed; picking one in the tree means reading it,
    // first, and retrying it if its last fetch failed.
    if (onLoadFile) {
      onLoadFile(navigationTargetFile, true);
      if (getIsCollapsed(navigationTargetFile)) toggleFile(navigationTargetFile);
    }
    codeViewRef.current?.scrollTo({
      type: "item",
      id: navigationTargetFile,
      align: "start",
      behavior: "smooth",
    });
    setFlashedFile(navigationTargetFile);
    // Clears `navigationTargetFile` so a re-render can't re-scroll. The flash is
    // held separately: keying it off the navigation target would clear it in the
    // same tick, before the reviewer ever sees it.
    onNavigationHandled(navigationTargetFile);
  }, [navigationTargetFile, onNavigationHandled, onLoadFile, getIsCollapsed, toggleFile]);

  // Drop the flash rule well after the animation has finished. The fade itself is
  // the CSS animation below, not this timer.
  useEffect(() => {
    if (!flashedFile) return;
    const timer = setTimeout(() => setFlashedFile(null), NAVIGATION_FLASH_CLEANUP_MS);
    return () => clearTimeout(timer);
  }, [flashedFile]);

  // Tint the file the reviewer was just sent to. Targets the container by the
  // `data-file-id` stamped in `handlePostRender` — CodeView itself leaves these
  // elements attribute-less, so without that stamp this selector matches nothing.
  useEffect(() => {
    if (!styleRef.current) {
      styleRef.current = document.createElement("style");
      styleRef.current.setAttribute("data-selected-file-css", "");
      document.head.appendChild(styleRef.current);
    }
    if (flashedFile) {
      const escaped = flashedFile.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
      // A CSS animation rather than a JS-timed tint: it starts when the element
      // begins matching the selector, i.e. when the target section mounts at the
      // end of the smooth scroll. A timer started at click time would instead
      // burn most of its duration while the target was still off screen and
      // unmounted, and on a long scroll would expire before the reviewer arrived.
      styleRef.current.textContent = `
        @keyframes local-review-navigation-flash {
          from { background-color: color-mix(in oklab, var(--color-accent) 16%, transparent); }
          to { background-color: transparent; }
        }
        diffs-container[data-file-id="${escaped}"] {
          animation: local-review-navigation-flash ${NAVIGATION_FLASH_MS}ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          diffs-container[data-file-id="${escaped}"] { animation: none; }
        }
      `;
    } else {
      styleRef.current.textContent = "";
    }
  }, [flashedFile]);

  // Stamp the file id on each item's rendered container. CodeView leaves these
  // elements attribute-less and recycles them between items, so this is the only
  // way to address one file's section from CSS — used by the navigation
  // highlight effect above. `onPostRender` runs on every (re)render of an item,
  // which is exactly when a recycled container needs its id refreshed.
  const handlePostRender = useCallback(
    (
      node: HTMLElement,
      _instance: unknown,
      phase: PostRenderPhase,
      context: { item: DiffCodeViewItem },
    ) => {
      if (phase === "unmount") {
        node.removeAttribute("data-file-id");
        node.removeAttribute("data-md-preview");
        return;
      }
      node.setAttribute("data-file-id", context.item.id);
      // Lets the shadow CSS hide the preview item's placeholder line.
      node.toggleAttribute("data-md-preview", isPreviewItem(context.item));
    },
    [],
  );

  const renderAnnotation = useCallback(
    (
      annotation: LineAnnotation<CommentAnnotation> | DiffLineAnnotation<CommentAnnotation>,
      item: DiffCodeViewItem,
    ) => {
      if (!annotation.metadata) return null;
      const { preview, comments } = annotation.metadata;
      if (preview != null) {
        return (
          <Suspense
            fallback={<div className="px-4 py-6 text-[13px] text-muted">Loading preview…</div>}
          >
            <MarkdownPreview
              filePath={item.id}
              content={preview}
              comments={comments}
              source={source}
              onRequestComment={requestLineComment}
              onDeleteComment={onDeleteComment}
              onUpdateComment={onUpdateComment}
            />
          </Suspense>
        );
      }
      return (
        <div className="border-t border-hair">
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
    [source, onDeleteComment, onUpdateComment, requestLineComment],
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
      const {
        reviewFiles: review,
        fileLevelCommentsByFile: fileMap,
        previewable: previewableFiles,
        sourceFiles: shownAsSource,
      } = metaRef.current;
      const commentCount = fileMap.get(filePath)?.length ?? 0;
      const viewed = review[filePath]?.viewed ?? false;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          {previewableFiles.has(filePath) ? (
            <MarkdownViewToggle
              preview={!shownAsSource.has(filePath)}
              onChange={(preview) => setPreview(filePath, preview)}
            />
          ) : null}
          <FileCommentBadge
            count={commentCount}
            onClick={() => openDrawer(filePath, commentCount === 0)}
          />
          <ViewedToggle viewed={viewed} onClick={() => toggleViewed(filePath)} />
        </span>
      );
    },
    [openDrawer, toggleViewed, setPreview],
  );

  const renderGutterUtility = useCallback(
    (getHoveredLine: GutterHoverGetter, item: DiffCodeViewItem) =>
      // The preview's placeholder line isn't a file line; its blocks carry
      // their own add-comment buttons.
      isPreviewItem(item) ? null : (
        // Slotted into CodeView's gutter, so document styles reach it.
        <AddCommentButton
          className="absolute -left-2 top-1/2 -translate-y-1/2 z-10"
          label="Add comment"
          onClick={() => {
            const hovered = getHoveredLine();
            if (!hovered) return;
            // Folder items report no side: the comment is on a raw file line.
            const side =
              item.type === "file" ? null : hovered.side === "deletions" ? "deletion" : "addition";
            requestLineComment(item.id, hovered.lineNumber, side);
          }}
        />
      ),
    [requestLineComment],
  );

  // Must keep its identity between renders. CodeView compares options with a
  // shallow identity check, so an inline object literal (with its nested
  // `itemMetrics`/`layout`) counts as changed on every render. That runs
  // `setOptions` → `capturePendingLayoutAnchor`, which restores the scroll to the
  // last anchor — so any state change while reading, a comment or the active file
  // updating, would yank the reader back up the page.
  const codeViewOptions = useMemo(
    () => ({
      theme: THEME,
      themeType: theme,
      diffStyle,
      lineDiffType: "word" as const,
      overflow: wrapLines ? ("wrap" as const) : ("scroll" as const),
      disableLineNumbers: !showLineNumbers,
      enableGutterUtility: true,
      stickyHeaders: true,
      onPostRender: handlePostRender,
      // Keep height estimation accurate when the user changes line-height
      // (rendered row height = --diffs-line-height below). Without this the
      // estimator uses the library default (20px) → drifting scrollbar and
      // jumpy scrollTo to far, not-yet-measured files.
      itemMetrics: { lineHeight },
      layout: CODE_VIEW_LAYOUT,
      unsafeCSS: `
        :host {
          --diffs-font-size: ${fontSize}px;
          --diffs-line-height: ${lineHeight}px;
          --diffs-font-family: var(--font-mono);
          /* The file header is chrome, not content: UI face, fixed size. */
          --diffs-header-font-family: var(--font-body);
          /* Tints come from the tokens, which the library mixes with the diff
             ground itself. Kept as var() references because a change to this
             string resets every item's layout. */
          --diffs-addition-color-override: var(--color-success);
          --diffs-deletion-color-override: var(--color-danger);
        }

        /* --diffs-font-size is inherited from :host, so the header and hunk
           separators would grow with the code. Pinned here rather than scoped,
           because the row layout maths reads the variable from :host. */
        [data-diffs-header],
        [data-separator] {
          font-size: ${HEADER_FONT_SIZE}px;
          line-height: ${HEADER_LINE_HEIGHT}px;
        }

        /* Default is "overflow: scroll clip", which always shows the
           horizontal scrollbar even when content fits or wrap is enabled.
           Override: hidden when wrapping (no scroll possible), auto when
           not (only when content actually overflows). */
        [data-code] {
          overflow-x: ${wrapLines ? "hidden" : "auto"} !important;
        }

        /* A markdown preview item is an empty file whose file-level annotation
           carries the rendered preview: show only that, full width. */
        :host([data-md-preview]) [data-gutter],
        :host([data-md-preview]) [data-content] > [data-line] {
          display: none;
        }
        /* Its track would otherwise size to the content, which for an empty
           file is just the preview's own width: take the section's instead. */
        :host([data-md-preview]) [data-content] {
          grid-column: 1 / -1;
          grid-template-columns: minmax(0, 1fr);
        }
        :host([data-md-preview]) [data-line-annotation] {
          --diffs-line-bg: var(--diffs-bg);
        }
      `,
    }),
    [theme, diffStyle, wrapLines, showLineNumbers, fontSize, lineHeight, handlePostRender],
  );

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        <div className="text-center">
          <p className="text-lg">{folder ? "No files to review" : "No changes found"}</p>
          <p className="text-sm mt-1">
            {folder
              ? "The folder is empty or only holds binary or oversized files"
              : "Nothing differs for this launch mode"}
          </p>
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
        key={diffKey}
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
        options={codeViewOptions}
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
