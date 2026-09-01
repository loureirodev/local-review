import { parsePatchFiles } from "@pierre/diffs";
import type { DiffLineAnnotation } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import { useMemo } from "react";
import { compareByTreeOrder } from "../../utils/treeOrder";
import { type CommentAnnotation, getVisibleLines } from "./diffParsing";

export interface DiffData {
  allFileDiffs: ReturnType<typeof parsePatchFiles>[number]["files"] | null;
  lineAnnotationsByFile: Map<string, DiffLineAnnotation<CommentAnnotation>[]>;
  fileLevelCommentsByFile: Map<string, ReviewComment[]>;
}

export function useDiffData(patch: string, reviewFiles: Record<string, FileReviewState>): DiffData {
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

  const { lineAnnotationsByFile, fileLevelCommentsByFile } = useMemo(() => {
    const annotations = new Map<string, DiffLineAnnotation<CommentAnnotation>[]>();
    const fileLevelMap = new Map<string, ReviewComment[]>();
    for (const [filePath, fileReview] of Object.entries(reviewFiles)) {
      const visible = visibleLinesByFile.get(filePath);
      const fileAnnotations: DiffLineAnnotation<CommentAnnotation>[] = [];
      const fileComments: ReviewComment[] = [];
      for (const comment of fileReview.comments) {
        if (comment.line === null) {
          fileComments.push(comment);
        } else {
          const side = comment.side === "deletion" ? "deletions" : "additions";
          const lineSet = visible?.[side];
          if (lineSet?.has(comment.line)) {
            fileAnnotations.push({
              side,
              lineNumber: comment.line,
              metadata: { comments: [comment] },
            });
          } else {
            fileComments.push(comment);
          }
        }
      }
      annotations.set(filePath, fileAnnotations);
      if (fileComments.length > 0) fileLevelMap.set(filePath, fileComments);
    }
    return { lineAnnotationsByFile: annotations, fileLevelCommentsByFile: fileLevelMap };
  }, [reviewFiles, visibleLinesByFile]);

  return {
    allFileDiffs,
    lineAnnotationsByFile,
    fileLevelCommentsByFile,
  };
}
