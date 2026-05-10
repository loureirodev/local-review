import { parsePatchFiles } from "@pierre/diffs";
import type { DiffLineAnnotation } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import { useMemo } from "react";
import { compareByTreeOrder } from "../FileTree.js";
import {
  type CommentAnnotation,
  type FileDiffSummary,
  getVisibleLines,
  summarizeFileDiff,
} from "./diffParsing.js";

export interface DiffData {
  allFileDiffs: ReturnType<typeof parsePatchFiles>[number]["files"] | null;
  summaryByFile: Map<string, FileDiffSummary>;
  totalLines: number;
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

  const summaryByFile = useMemo(() => {
    const map = new Map<string, FileDiffSummary>();
    if (!allFileDiffs) return map;
    for (const fd of allFileDiffs) {
      map.set(fd.name, summarizeFileDiff(fd));
    }
    return map;
  }, [allFileDiffs]);

  const totalLines = useMemo(() => {
    let total = 0;
    for (const summary of summaryByFile.values()) total += summary.lines;
    return total;
  }, [summaryByFile]);

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

  return {
    allFileDiffs,
    summaryByFile,
    totalLines,
    lineAnnotationsByFile,
    fileLevelCommentsByFile,
  };
}
