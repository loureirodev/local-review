import type { LineAnnotation } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import { useMemo } from "react";
import {
  type CommentAnnotation,
  type FolderFileState,
  splitComments,
  type ViewerEntry,
} from "./diffParsing";

export interface FolderData {
  entries: ViewerEntry[];
  lineAnnotationsByFile: Map<string, LineAnnotation<CommentAnnotation>[]>;
  fileLevelCommentsByFile: Map<string, ReviewComment[]>;
}

/** Lines in `content`, without allocating them; a trailing newline ends the
 *  last line rather than starting another. */
function lineCount(content: string): number {
  if (content === "") return 0;
  let lines = 1;
  for (let i = content.indexOf("\n"); i !== -1; i = content.indexOf("\n", i + 1)) lines++;
  return content.endsWith("\n") ? lines - 1 : lines;
}

/** Folder-mode counterpart of `useDiffData`: one `file` entry per path, and
 *  comments split into line annotations and file-level ones. */
export function useFolderData(
  paths: string[],
  files: Record<string, FolderFileState>,
  reviewFiles: Record<string, FileReviewState>,
): FolderData {
  const entries = useMemo<ViewerEntry[]>(
    () => paths.map((name) => ({ type: "file", name, file: files[name] })),
    [paths, files],
  );

  const { lineAnnotationsByFile, fileLevelCommentsByFile } = useMemo(() => {
    // Counted only for files with line comments, and once per file.
    const lineCounts = new Map<string, number>();
    const maxLine = (filePath: string): number => {
      const file = files[filePath];
      // Not loaded yet: nothing to check the line against.
      if (file?.status !== "loaded") return Number.POSITIVE_INFINITY;
      let count = lineCounts.get(filePath);
      if (count === undefined) {
        count = lineCount(file.content);
        lineCounts.set(filePath, count);
      }
      return count;
    };
    // A line past the end (the file changed since the review) can't be anchored.
    return splitComments(
      reviewFiles,
      (filePath, comment, line): LineAnnotation<CommentAnnotation> | null =>
        line <= maxLine(filePath) ? { lineNumber: line, metadata: { comments: [comment] } } : null,
    );
  }, [reviewFiles, files]);

  return { entries, lineAnnotationsByFile, fileLevelCommentsByFile };
}
