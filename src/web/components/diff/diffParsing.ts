import type { DiffLineAnnotation, FileDiffMetadata, LineAnnotation } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";

export interface CommentAnnotation {
  comments: ReviewComment[];
}

/** Diff items annotate a side; folder file items only a line. */
export type CommentLineAnnotation =
  | DiffLineAnnotation<CommentAnnotation>
  | LineAnnotation<CommentAnnotation>;

/** A folder file's content once requested. Absent until it is. */
export type FolderFileState =
  | { status: "loaded"; content: string }
  | { status: "error"; message: string };

/** One section of the viewer: a file diff, or a raw folder file. */
export type ViewerEntry =
  | { type: "diff"; fileDiff: FileDiffMetadata }
  | { type: "file"; name: string; file: FolderFileState | undefined };

export function entryName(entry: ViewerEntry): string {
  return entry.type === "diff" ? entry.fileDiff.name : entry.name;
}

export const EMPTY_ANNOTATIONS: CommentLineAnnotation[] = [];
export const EMPTY_COMMENTS: ReviewComment[] = [];

export interface SplitComments<A> {
  lineAnnotationsByFile: Map<string, A[]>;
  fileLevelCommentsByFile: Map<string, ReviewComment[]>;
}

/** Splits each file's comments into line annotations and file-level ones. When
 *  `anchor` returns null the line isn't shown, so the comment goes file-level. */
export function splitComments<A>(
  reviewFiles: Record<string, FileReviewState>,
  anchor: (filePath: string, comment: ReviewComment, line: number) => A | null,
): SplitComments<A> {
  const lineAnnotationsByFile = new Map<string, A[]>();
  const fileLevelCommentsByFile = new Map<string, ReviewComment[]>();
  for (const [filePath, fileReview] of Object.entries(reviewFiles)) {
    const fileAnnotations: A[] = [];
    const fileComments: ReviewComment[] = [];
    for (const comment of fileReview.comments) {
      const annotation = comment.line === null ? null : anchor(filePath, comment, comment.line);
      if (annotation) fileAnnotations.push(annotation);
      else fileComments.push(comment);
    }
    lineAnnotationsByFile.set(filePath, fileAnnotations);
    if (fileComments.length > 0) fileLevelCommentsByFile.set(filePath, fileComments);
  }
  return { lineAnnotationsByFile, fileLevelCommentsByFile };
}

/** Extract the set of visible line numbers per side from a parsed file diff. */
export function getVisibleLines(fileDiff: FileDiffMetadata): {
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
        for (let i = 0; i < content.lines; i++) {
          additions.add(addLine++);
          deletions.add(delLine++);
        }
      } else {
        for (let i = 0; i < content.deletions; i++) {
          deletions.add(delLine++);
        }
        for (let i = 0; i < content.additions; i++) {
          additions.add(addLine++);
        }
      }
    }
  }

  return { additions, deletions };
}
