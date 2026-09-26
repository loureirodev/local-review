import { parsePatchFiles } from "@pierre/diffs";
import type { DiffLineAnnotation } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import { useMemo } from "react";
import { compareByTreeOrder } from "../../utils/treeOrder";
import { type CommentAnnotation, getVisibleLines, splitComments } from "./diffParsing";

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

  const { lineAnnotationsByFile, fileLevelCommentsByFile } = useMemo(
    () =>
      splitComments(
        reviewFiles,
        (filePath, comment, line): DiffLineAnnotation<CommentAnnotation> | null => {
          const side = comment.side === "deletion" ? "deletions" : "additions";
          if (!visibleLinesByFile.get(filePath)?.[side].has(line)) return null;
          return { side, lineNumber: line, metadata: { comments: [comment] } };
        },
      ),
    [reviewFiles, visibleLinesByFile],
  );

  return {
    allFileDiffs,
    lineAnnotationsByFile,
    fileLevelCommentsByFile,
  };
}
