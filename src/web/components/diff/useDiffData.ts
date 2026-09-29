import type { DiffLineAnnotation, FileDiffMetadata } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types";
import { useMemo } from "react";
import { type CommentAnnotation, getVisibleLines, splitComments, toDiffSide } from "./diffParsing";

export interface DiffData {
  lineAnnotationsByFile: Map<string, DiffLineAnnotation<CommentAnnotation>[]>;
  fileLevelCommentsByFile: Map<string, ReviewComment[]>;
}

/** `fileDiffs` are parsed (and sorted) once, by the app. */
export function useDiffData(
  fileDiffs: FileDiffMetadata[],
  reviewFiles: Record<string, FileReviewState>,
): DiffData {
  const visibleLinesByFile = useMemo(() => {
    const map = new Map<string, { additions: Set<number>; deletions: Set<number> }>();
    for (const fd of fileDiffs) {
      map.set(fd.name, getVisibleLines(fd));
    }
    return map;
  }, [fileDiffs]);

  const { lineAnnotationsByFile, fileLevelCommentsByFile } = useMemo(
    () =>
      splitComments(
        reviewFiles,
        (filePath, comment, line): DiffLineAnnotation<CommentAnnotation> | null => {
          const side = toDiffSide(comment.side);
          if (!visibleLinesByFile.get(filePath)?.[side].has(line)) return null;
          return { side, lineNumber: line, metadata: { comments: [comment] } };
        },
      ),
    [reviewFiles, visibleLinesByFile],
  );

  return { lineAnnotationsByFile, fileLevelCommentsByFile };
}
