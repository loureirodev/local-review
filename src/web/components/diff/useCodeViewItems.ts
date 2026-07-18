import type { CodeViewItem, DiffLineAnnotation, FileDiffMetadata } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import { useCallback, useMemo, useRef } from "react";
import type { CommentAnnotation } from "./diffParsing";
import { EMPTY_ANNOTATIONS } from "./diffParsing";

export type DiffCodeViewItem = CodeViewItem<CommentAnnotation>;

interface UseCodeViewItemsParams {
  allFileDiffs: FileDiffMetadata[];
  lineAnnotationsByFile: Map<string, DiffLineAnnotation<CommentAnnotation>[]>;
  fileLevelCommentsByFile: Map<string, ReviewComment[]>;
  reviewFiles: Record<string, FileReviewState>;
  getIsCollapsed: (filePath: string) => boolean;
}

export interface CodeViewItemsResult {
  /** Stable key that changes when the file set changes, so the consumer can
   *  remount `<CodeView>` with fresh `initialItems` (imperative mode owns the
   *  list and the handle exposes no `setItems`/`removeItem`). */
  filesKey: string;
  /** Items to seed the viewer once via `initialItems`. Recomputed on remount. */
  initialItems: DiffCodeViewItem[];
  /** Return the full items whose render signature changed since the last call,
   *  bumping each one's monotonic `version`. Drives `ref.updateItem`. */
  collectUpdatedItems: () => DiffCodeViewItem[];
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function commentSig(comment: ReviewComment): string {
  return `${comment.id}:${comment.edited ? 1 : 0}:${comment.line}:${comment.side}:${hashString(comment.body)}`;
}

interface VersionEntry {
  sig: string;
  n: number;
}

/**
 * Maps `FileDiffMetadata[]` to CodeView items and owns the per-item `version`
 * signature (D4). Render-affecting state (collapsed, viewed, comments, and the
 * underlying diff content) is folded into a string `sig`; when an item's `sig`
 * changes, its `version` is bumped and the item is re-emitted so the viewer can
 * refresh only that item via `updateItem` without recreating the list (D2).
 */
export function useCodeViewItems({
  allFileDiffs,
  lineAnnotationsByFile,
  fileLevelCommentsByFile,
  reviewFiles,
  getIsCollapsed,
}: UseCodeViewItemsParams): CodeViewItemsResult {
  const fileDiffById = useMemo(() => {
    const map = new Map<string, FileDiffMetadata>();
    for (const fd of allFileDiffs) map.set(fd.name, fd);
    return map;
  }, [allFileDiffs]);

  const filesKey = useMemo(() => allFileDiffs.map((fd) => fd.name).join("\n"), [allFileDiffs]);

  // Latest render inputs, read by the sig/item builders (which run inside an
  // effect, after render). Keeps the builders pointed at fresh data without
  // recreating callbacks on every keystroke.
  const latest = useRef({
    fileDiffById,
    lineAnnotationsByFile,
    fileLevelCommentsByFile,
    reviewFiles,
    getIsCollapsed,
  });
  latest.current = {
    fileDiffById,
    lineAnnotationsByFile,
    fileLevelCommentsByFile,
    reviewFiles,
    getIsCollapsed,
  };

  const versionRef = useRef<Map<string, VersionEntry>>(new Map());

  const computeSig = useCallback((id: string): string => {
    const {
      fileDiffById: byId,
      lineAnnotationsByFile: lineMap,
      fileLevelCommentsByFile: fileMap,
      reviewFiles: review,
      getIsCollapsed: isCollapsed,
    } = latest.current;
    const fileDiff = byId.get(id);
    const collapsed = isCollapsed(id) ? 1 : 0;
    const viewed = review[id]?.viewed ? 1 : 0;

    const parts: string[] = [];
    const lineAnns = lineMap.get(id);
    if (lineAnns) {
      for (const ann of lineAnns) {
        for (const comment of ann.metadata?.comments ?? []) parts.push(commentSig(comment));
      }
    }
    const fileComments = fileMap.get(id);
    if (fileComments) {
      for (const comment of fileComments) parts.push(commentSig(comment));
    }

    const fileDiffSig = fileDiff
      ? `${fileDiff.name}:${fileDiff.type}:${fileDiff.hunks.length}`
      : "none";
    return `${collapsed}|${viewed}|${fileDiffSig}|${parts.join(",")}`;
  }, []);

  const buildItem = useCallback((id: string, version: number): DiffCodeViewItem | undefined => {
    const {
      fileDiffById: byId,
      lineAnnotationsByFile: lineMap,
      getIsCollapsed: isCollapsed,
    } = latest.current;
    const fileDiff = byId.get(id);
    if (!fileDiff) return undefined;
    return {
      id,
      type: "diff",
      fileDiff,
      annotations: lineMap.get(id) ?? EMPTY_ANNOTATIONS,
      collapsed: isCollapsed(id),
      version,
    };
  }, []);

  // Seed initialItems and reset the version map whenever the file set changes
  // (remount). Each item starts at version 0 with its current signature.
  const initialItems = useMemo(() => {
    const versions = new Map<string, VersionEntry>();
    const items: DiffCodeViewItem[] = [];
    for (const fileDiff of allFileDiffs) {
      const id = fileDiff.name;
      versions.set(id, { sig: computeSig(id), n: 0 });
      const item = buildItem(id, 0);
      if (item) items.push(item);
    }
    versionRef.current = versions;
    return items;
  }, [allFileDiffs, computeSig, buildItem]);

  const collectUpdatedItems = useCallback((): DiffCodeViewItem[] => {
    const versions = versionRef.current;
    const updated: DiffCodeViewItem[] = [];
    for (const [id, entry] of versions) {
      const sig = computeSig(id);
      if (sig === entry.sig) continue;
      const n = entry.n + 1;
      versions.set(id, { sig, n });
      const item = buildItem(id, n);
      if (item) updated.push(item);
    }
    return updated;
  }, [computeSig, buildItem]);

  return { filesKey, initialItems, collectUpdatedItems };
}
