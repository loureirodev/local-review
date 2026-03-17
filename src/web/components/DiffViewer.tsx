import { parsePatchFiles } from "@pierre/diffs";
import type { DiffLineAnnotation, FileDiffMetadata } from "@pierre/diffs/react";
import { FileDiff } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReview } from "../context/ReviewContext.js";
import { useSettings } from "../hooks/useSettings.js";
import CommentDisplay from "./CommentDisplay.js";
import CommentInput from "./CommentInput.js";
import { getFileSectionId, pickActiveFile } from "./diffNavigation.js";
import FileCommentsDrawer from "./FileCommentsDrawer.js";
import { compareByTreeOrder } from "./FileTree.js";

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
        for (let i = 0; i < content.lines.length; i++) {
          additions.add(addLine++);
          deletions.add(delLine++);
        }
      } else {
        for (let i = 0; i < content.deletions.length; i++) {
          deletions.add(delLine++);
        }
        for (let i = 0; i < content.additions.length; i++) {
          additions.add(addLine++);
        }
      }
    }
  }

  return { additions, deletions };
}

interface DiffViewerProps {
  patch: string;
  selectedFile: string | null;
  navigationTargetFile: string | null;
  reviewFiles: Record<string, FileReviewState>;
  onNavigationHandled: (filePath: string) => void;
  onActiveFileChange: (filePath: string) => void;
  onAddComment: (comment: ReviewComment) => void;
  onDeleteComment: (filePath: string, commentId: string) => void;
  onUpdateComment: (filePath: string, commentId: string, body: string) => void;
}

interface CommentAnnotation {
  comments: ReviewComment[];
}

interface ActiveInput {
  filePath: string;
  line: number | null;
  side: "addition" | "deletion" | null;
}

export default function DiffViewer({
  patch,
  selectedFile,
  navigationTargetFile,
  reviewFiles,
  onNavigationHandled,
  onActiveFileChange,
  onAddComment,
  onDeleteComment,
  onUpdateComment,
}: DiffViewerProps) {
  const {
    state: { diffStyle, wrapLines, showLineNumbers, fontSize, lineHeight },
  } = useSettings();
  const {
    state: { source },
  } = useReview();
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

  /** Map of visible line numbers per file, keyed by file name. */
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
          // Only add as inline annotation if line exists in the diff
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

  /** File-level comments: explicit file comments + orphaned line comments. */
  const fileLevelCommentsByFile = useMemo(() => {
    const map = new Map<string, ReviewComment[]>();

    for (const [filePath, fileReview] of Object.entries(reviewFiles)) {
      const visible = visibleLinesByFile.get(filePath);
      const fileComments: ReviewComment[] = [];

      for (const comment of fileReview.comments) {
        if (comment.line === null) {
          // Explicit file-level comment
          fileComments.push(comment);
        } else if (visible) {
          // Check if this line comment is orphaned (line not in current diff)
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

  /** Which file's drawer is open, and whether to show the input immediately. */
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

  const createHoverUtilityRenderer = useCallback((filePath: string) => {
    return (getHoveredLine: () => { lineNumber: number; side: string } | undefined) => {
      return (
        <button
          type="button"
          onClick={() => {
            const hovered = getHoveredLine();
            if (!hovered) return;

            setActiveInput({
              filePath,
              line: hovered.lineNumber,
              side: (hovered.side === "deletions" ? "deletion" : "addition") as
                | "addition"
                | "deletion",
            });
          }}
          className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-neutral-700/90 hover:bg-neutral-600 text-neutral-300 hover:text-neutral-100 rounded-full flex items-center justify-center text-lg shadow-lg shadow-black/30 z-10 transition-colors border border-neutral-600/50"
          title="Add comment"
        >
          +
        </button>
      );
    };
  }, []);

  const openDrawer = useCallback((filePath: string, showInput = false) => {
    setDrawerState({ filePath, showInput });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerState(null);
  }, []);

  const createHeaderMetadataRenderer = useCallback(
    (filePath: string, fileComments: ReviewComment[]) => {
      const count = fileComments.length;
      return () => (
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDrawer(filePath, count === 0);
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
              count > 0
                ? `${count} file-level comment${count !== 1 ? "s" : ""}`
                : "Add file comment"
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
        </span>
      );
    },
    [openDrawer],
  );

  useEffect(() => {
    if (!navigationTargetFile) return;

    const targetElement = document.getElementById(getFileSectionId(navigationTargetFile));
    if (!targetElement) return;

    const supportsSmoothScroll = "scrollBehavior" in document.documentElement.style;

    targetElement.scrollIntoView({
      behavior: supportsSmoothScroll ? "smooth" : "auto",
      block: "start",
    });
    onNavigationHandled(navigationTargetFile);
  }, [navigationTargetFile, onNavigationHandled]);

  const intersectionStatesRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!allFileDiffs || allFileDiffs.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    intersectionStatesRef.current.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        // Update stored intersection state for each changed entry
        for (const entry of entries) {
          const filePath = entry.target.getAttribute("data-file-path") ?? "";
          intersectionStatesRef.current.set(filePath, entry.isIntersecting);
        }

        // Build full candidate list from all observed sections using current positions
        const candidates = allFileDiffs
          .map((fd) => {
            const el = document.getElementById(getFileSectionId(fd.name));
            if (!el) return null;
            return {
              filePath: fd.name,
              isIntersecting: intersectionStatesRef.current.get(fd.name) ?? false,
              top: el.getBoundingClientRect().top,
            };
          })
          .filter((c) => c !== null);

        const activeFile = pickActiveFile(candidates);
        if (activeFile) {
          onActiveFileChange(activeFile);
        }
      },
      {
        threshold: 0,
        rootMargin: "0px 0px -20% 0px",
      },
    );

    for (const fileDiff of allFileDiffs) {
      const section = document.getElementById(getFileSectionId(fileDiff.name));
      if (section) {
        observer.observe(section);
      }
    }

    return () => {
      observer.disconnect();
      intersectionStatesRef.current.clear();
    };
  }, [allFileDiffs, onActiveFileChange]);

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
    ? (fileLevelCommentsByFile.get(drawerState.filePath) ?? [])
    : [];

  return (
    <div className="h-full overflow-auto">
      {allFileDiffs.map((fileDiff) => {
        const sectionId = getFileSectionId(fileDiff.name);
        const isSelected = selectedFile === fileDiff.name;
        const fileComments = fileLevelCommentsByFile.get(fileDiff.name) ?? [];

        return (
          <section
            key={fileDiff.name}
            id={sectionId}
            data-file-path={fileDiff.name}
            className={`border-b border-neutral-800/70 ${isSelected ? "bg-blue-500/5" : ""}`}
          >
            <FileDiff
              fileDiff={fileDiff}
              options={{
                diffStyle,
                theme: { dark: "github-dark", light: "github-light" },
                themeType: "dark",
                lineDiffType: "word",
                overflow: wrapLines ? "wrap" : "scroll",
                disableLineNumbers: !showLineNumbers,
                expandUnchanged: true,
                enableHoverUtility: true,
                unsafeCSS: `
                  :host {
                    --diffs-font-size: ${fontSize}px;
                    --diffs-line-height: ${lineHeight}px;
                  }
                  [data-diffs-header] {
                    position: sticky;
                    top: 0;
                    z-index: 5;
                    background: color-mix(in oklab, #0a0a0a 92%, transparent);
                    backdrop-filter: blur(4px);
                  }
                `,
              }}
              lineAnnotations={lineAnnotationsByFile.get(fileDiff.name) ?? []}
              renderAnnotation={renderAnnotation}
              renderHoverUtility={createHoverUtilityRenderer(fileDiff.name)}
              renderHeaderMetadata={createHeaderMetadataRenderer(fileDiff.name, fileComments)}
            />
          </section>
        );
      })}

      {/* File-level comments drawer */}
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

      {/* Active comment input overlay */}
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
    </div>
  );
}
