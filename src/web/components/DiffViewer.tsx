import { parsePatchFiles } from "@pierre/diffs";
import type { DiffLineAnnotation } from "@pierre/diffs/react";
import { FileDiff } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../hooks/useSettings.js";
import CommentDisplay from "./CommentDisplay.js";
import CommentInput from "./CommentInput.js";
import { getFileSectionId, pickActiveFile } from "./diffNavigation.js";

interface DiffViewerProps {
  patch: string;
  selectedFile: string | null;
  navigationTargetFile: string | null;
  reviewFiles: Record<string, FileReviewState>;
  onNavigationHandled: (filePath: string) => void;
  onActiveFileChange: (filePath: string) => void;
  onAddComment: (comment: ReviewComment) => void;
  onDeleteComment: (filePath: string, commentId: string) => void;
}

interface CommentAnnotation {
  comments: ReviewComment[];
}

interface ActiveInput {
  filePath: string;
  line: number;
  side: "addition" | "deletion";
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
}: DiffViewerProps) {
  const {
    state: { diffStyle, wrapLines, showLineNumbers, fontSize, lineHeight },
  } = useSettings();
  const [activeInput, setActiveInput] = useState<ActiveInput | null>(null);

  const allFileDiffs = useMemo(() => {
    if (!patch) return null;

    try {
      const parsed = parsePatchFiles(patch);
      return parsed.flatMap((parsedPatch) => parsedPatch.files);
    } catch {
      return null;
    }
  }, [patch]);

  const lineAnnotationsByFile = useMemo(() => {
    const annotations = new Map<string, DiffLineAnnotation<CommentAnnotation>[]>();

    for (const [filePath, fileReview] of Object.entries(reviewFiles)) {
      const fileAnnotations: DiffLineAnnotation<CommentAnnotation>[] = [];
      for (const comment of fileReview.comments) {
        if (comment.line !== null) {
          fileAnnotations.push({
            side: comment.side === "deletion" ? "deletions" : "additions",
            lineNumber: comment.line,
            metadata: { comments: [comment] },
          });
        }
      }

      annotations.set(filePath, fileAnnotations);
    }

    return annotations;
  }, [reviewFiles]);

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
        <div className="border-t border-neutral-800">
          {annotation.metadata.comments.map((comment) => (
            <CommentDisplay
              key={comment.id}
              comment={comment}
              onDelete={(id) => onDeleteComment(comment.filePath, id)}
            />
          ))}
        </div>
      );
    },
    [onDeleteComment],
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
          className="absolute -left-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-xs shadow-lg z-10 transition-colors"
          title="Add comment"
        >
          +
        </button>
      );
    };
  }, []);

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

  useEffect(() => {
    if (!allFileDiffs || allFileDiffs.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const activeFile = pickActiveFile(
          entries.map((entry) => ({
            filePath: entry.target.getAttribute("data-file-path") ?? "",
            isIntersecting: entry.isIntersecting,
            top: entry.boundingClientRect.top,
          })),
        );

        if (activeFile) {
          onActiveFileChange(activeFile);
        }
      },
      {
        threshold: [0.2, 0.5, 0.8],
        rootMargin: "-8% 0px -70% 0px",
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

  return (
    <div className="h-full overflow-auto">
      {allFileDiffs.map((fileDiff) => {
        const sectionId = getFileSectionId(fileDiff.name);
        const isSelected = selectedFile === fileDiff.name;

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
            />
          </section>
        );
      })}

      {/* Active comment input overlay */}
      {activeInput && (
        <div className="fixed bottom-4 right-4 w-96 z-50 shadow-xl">
          <div className="text-xs text-neutral-400 px-2 py-1 bg-neutral-800 rounded-t border border-neutral-700 border-b-0">
            {activeInput.filePath}:{activeInput.line} ({activeInput.side})
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
