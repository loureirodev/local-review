import type { DiffLineAnnotation, FileDiffMetadata, LineAnnotation } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types";

export interface CommentAnnotation {
  comments: ReviewComment[];
  preview?: string;
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

export type DiffSide = "additions" | "deletions";

/** A comment's side as the diff library names it; a side-less comment is on
 *  the new file. */
export function toDiffSide(side: ReviewComment["side"]): DiffSide {
  return side === "deletion" ? "deletions" : "additions";
}

/** Lines in `content`, without allocating them; a trailing newline ends the
 *  last line rather than starting another. */
export function lineCount(content: string): number {
  if (content === "") return 0;
  let lines = 1;
  for (let i = content.indexOf("\n"); i !== -1; i = content.indexOf("\n", i + 1)) lines++;
  return content.endsWith("\n") ? lines - 1 : lines;
}

/** The text of `line` (1-based, at most `lineCount(content)`), without its
 *  line ending. */
export function contentLine(content: string, line: number): string {
  let start = 0;
  for (let i = 1; i < line; i++) start = content.indexOf("\n", start) + 1;
  const end = content.indexOf("\n", start);
  return content.slice(start, end === -1 ? undefined : end).replace(/\r$/, "");
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

/** The text of `line` on `side` of a parsed file diff, without its line ending;
 *  null when the line is not part of the diff's hunks. */
export function getLineText(
  fileDiff: FileDiffMetadata,
  side: DiffSide,
  line: number,
): string | null {
  const lines = side === "additions" ? fileDiff.additionLines : fileDiff.deletionLines;
  for (const hunk of fileDiff.hunks) {
    let addLine = hunk.additionStart;
    let delLine = hunk.deletionStart;
    for (const content of hunk.hunkContent) {
      const start = side === "additions" ? addLine : delLine;
      const count =
        content.type === "context"
          ? content.lines
          : side === "additions"
            ? content.additions
            : content.deletions;
      if (line >= start && line < start + count) {
        const index =
          (side === "additions" ? content.additionLineIndex : content.deletionLineIndex) +
          (line - start);
        const text = lines[index];
        return text === undefined ? null : text.replace(/\r?\n$/, "");
      }
      if (content.type === "context") {
        addLine += content.lines;
        delLine += content.lines;
      } else {
        addLine += content.additions;
        delLine += content.deletions;
      }
    }
  }
  return null;
}
