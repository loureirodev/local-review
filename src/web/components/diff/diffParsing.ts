import type { DiffLineAnnotation, FileDiffMetadata } from "@pierre/diffs/react";
import type { ReviewComment } from "@shared/types.js";

export interface CommentAnnotation {
  comments: ReviewComment[];
}

export const EMPTY_ANNOTATIONS: DiffLineAnnotation<CommentAnnotation>[] = [];
export const EMPTY_COMMENTS: ReviewComment[] = [];

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
