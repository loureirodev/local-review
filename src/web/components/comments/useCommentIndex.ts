import type { FileDiffMetadata } from "@pierre/diffs";
import type { FileReviewState, ReviewComment } from "@shared/types";
import { useMemo } from "react";
import { markdownToPlainText } from "../../utils/plainText";
import { compareByTreeOrder } from "../../utils/treeOrder";
import {
  contentLine,
  type FolderFileState,
  getLineText,
  lineCount,
  toDiffSide,
} from "../diff/diffParsing";

export interface IndexedComment {
  comment: ReviewComment;
  /** `orphan`: a line comment whose line is not in the current view. */
  kind: "line" | "file" | "orphan";
  /** The commented line's text, when the line is in the current view. */
  code: string | null;
  /** The body as plain text, for the excerpt and the filter. */
  text: string;
}

/** What the comments are placed against: the parsed patch, or the folder's files. */
export type CommentIndexSource =
  | { kind: "diff"; fileDiffs: ReadonlyMap<string, FileDiffMetadata> }
  | { kind: "folder"; files: Record<string, FolderFileState> };

type Placement = Pick<IndexedComment, "kind" | "code">;

/** Orphans sit with the file-level comments: both are shown in the file's
 *  drawer, at the top of its section, so `n` never scrolls back up to them. */
const KIND_ORDER: Record<IndexedComment["kind"], number> = { file: 0, orphan: 1, line: 2 };

function compareInFile(a: IndexedComment, b: IndexedComment): number {
  const kind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  if (kind !== 0) return kind;
  const line = (a.comment.line ?? 0) - (b.comment.line ?? 0);
  if (line !== 0) return line;
  // Same number on both sides: the old line reads first, as in a unified diff.
  return (a.comment.side === "deletion" ? 0 : 1) - (b.comment.side === "deletion" ? 0 : 1);
}

/** Places a file's line comments with the viewer's rules (`useDiffData` /
 *  `useFolderData`), so the list and the viewer agree on what is orphaned. */
function placer(
  source: CommentIndexSource,
  filePath: string,
): (line: number, side: ReviewComment["side"]) => Placement {
  if (source.kind === "diff") {
    const fileDiff = source.fileDiffs.get(filePath);
    return (line, side) => {
      // Null exactly when the line is outside the hunks the viewer shows.
      const code = fileDiff ? getLineText(fileDiff, toDiffSide(side), line) : null;
      return code === null ? { kind: "orphan", code: null } : { kind: "line", code };
    };
  }
  const file = source.files[filePath];
  // Not loaded yet (or failed): nothing to check the line against.
  if (file?.status !== "loaded") return () => ({ kind: "line", code: null });
  const maxLine = lineCount(file.content);
  return (line) =>
    line >= 1 && line <= maxLine
      ? { kind: "line", code: contentLine(file.content, line) }
      : { kind: "orphan", code: null };
}

/** Entries of the last build, reused while their comment and placement hold,
 *  so memoized cards skip re-rendering on unrelated review changes. */
const entryCache = new WeakMap<ReviewComment, IndexedComment>();

function indexEntry(comment: ReviewComment, { kind, code }: Placement): IndexedComment {
  const cached = entryCache.get(comment);
  if (cached?.kind === kind && cached.code === code) return cached;
  const entry = { comment, kind, code, text: markdownToPlainText(comment.body) };
  entryCache.set(comment, entry);
  return entry;
}

/** Every comment of the review, files in tree order, and within a file:
 *  file-level, then orphaned ones, then line comments by line. */
export function buildCommentIndex(
  reviewFiles: Record<string, FileReviewState>,
  source: CommentIndexSource,
): IndexedComment[] {
  const paths = Object.keys(reviewFiles)
    .filter((path) => reviewFiles[path].comments.length > 0)
    .sort(compareByTreeOrder);
  const index: IndexedComment[] = [];
  for (const path of paths) {
    const place = placer(source, path);
    const fileComments = reviewFiles[path].comments.map((comment) =>
      indexEntry(
        comment,
        comment.line === null ? { kind: "file", code: null } : place(comment.line, comment.side),
      ),
    );
    index.push(...fileComments.sort(compareInFile));
  }
  return index;
}

/** Comments whose body or path contains `query`, ignoring case. */
export function filterComments(index: IndexedComment[], query: string): IndexedComment[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return index;
  return index.filter(
    ({ comment, text }) =>
      text.toLowerCase().includes(needle) || comment.filePath.toLowerCase().includes(needle),
  );
}

/** The comment `n` (`direction` 1) or `p` (-1) goes to from `currentId`, in
 *  `visible`; null at either end, since navigation doesn't wrap. With no
 *  current comment, the first or last. A current comment the filter hides
 *  counts from its place in `all`. */
export function stepComment(
  all: IndexedComment[],
  visible: IndexedComment[],
  currentId: string | null,
  direction: 1 | -1,
): IndexedComment | null {
  if (visible.length === 0) return null;
  const allAt = currentId === null ? -1 : all.findIndex((entry) => entry.comment.id === currentId);
  // No current comment, or deleted since: start over.
  if (allAt === -1) return direction === 1 ? visible[0] : (visible.at(-1) as IndexedComment);
  // `visible` is a subsequence of `all`: walk `all` to the next visible entry.
  const visibleIds = new Set(visible.map((entry) => entry.comment.id));
  for (let i = allAt + direction; i >= 0 && i < all.length; i += direction) {
    if (visibleIds.has(all[i].comment.id)) return all[i];
  }
  return null;
}

/** The ordered comment list shared by the sidebar and the `n`/`p` shortcuts. */
export function useCommentIndex(
  reviewFiles: Record<string, FileReviewState>,
  source: CommentIndexSource,
  query: string,
): { all: IndexedComment[]; visible: IndexedComment[] } {
  const all = useMemo(() => buildCommentIndex(reviewFiles, source), [reviewFiles, source]);
  const visible = useMemo(() => filterComments(all, query), [all, query]);
  return { all, visible };
}
