import { parsePatchFiles } from "@pierre/diffs";
import type { DiffLineAnnotation } from "@pierre/diffs/react";
import { FileDiff } from "@pierre/diffs/react";
import type { ReviewComment } from "@shared/types.js";
import { useCallback, useMemo, useState } from "react";
import CommentDisplay from "./CommentDisplay.js";
import CommentInput from "./CommentInput.js";

interface DiffViewerProps {
  patch: string;
  diffStyle: "split" | "unified";
  wrapLines: boolean;
  showLineNumbers: boolean;
  fontSize: number;
  lineHeight: number;
  selectedFile: string | null;
  comments: ReviewComment[];
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
  diffStyle,
  wrapLines,
  showLineNumbers,
  fontSize,
  lineHeight,
  selectedFile,
  comments,
  onAddComment,
  onDeleteComment,
}: DiffViewerProps) {
  const [activeInput, setActiveInput] = useState<ActiveInput | null>(null);

  const fileDiff = useMemo(() => {
    if (!patch) return null;

    try {
      const parsed = parsePatchFiles(patch);
      const allFiles = parsed.flatMap((parsedPatch) => parsedPatch.files);

      if (allFiles.length === 0) return null;
      if (!selectedFile) return allFiles[0] ?? null;

      return allFiles.find((file) => file.name === selectedFile) ?? null;
    } catch {
      return null;
    }
  }, [patch, selectedFile]);

  // Build line annotations from comments for @pierre/diffs
  const lineAnnotations = useMemo(() => {
    const annotations: DiffLineAnnotation<CommentAnnotation>[] = [];
    for (const comment of comments) {
      if (comment.line !== null) {
        annotations.push({
          side: comment.side === "deletion" ? "deletions" : "additions",
          lineNumber: comment.line,
          metadata: { comments: [comment] },
        });
      }
    }
    return annotations;
  }, [comments]);

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

  // Render the hover utility for adding comments
  const renderHoverUtility = useCallback(
    (getHoveredLine: () => { lineNumber: number; side: string } | undefined) => {
      // Determine file path from patch context
      const filePath = selectedFile ?? fileDiff?.name ?? "";

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
    },
    [selectedFile, fileDiff],
  );

  if (!patch || !fileDiff) {
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
          unsafeCSS: `:host { --diffs-font-size: ${fontSize}px; --diffs-line-height: ${lineHeight}px; }`,
        }}
        lineAnnotations={lineAnnotations}
        renderAnnotation={renderAnnotation}
        renderHoverUtility={renderHoverUtility}
      />

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
