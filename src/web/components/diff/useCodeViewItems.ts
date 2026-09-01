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
  /** Changes when the file set changes (membership or order), signalling that
   *  a targeted `updateItem` pass is no longer enough and the viewer needs a
   *  full `setItems` reconcile. See D8 in design.md. */
  filesKey: string;
  /** Items to seed the viewer once via `initialItems`. */
  initialItems: DiffCodeViewItem[];
  /** Return the full items whose render signature changed since the last call,
   *  bumping each one's monotonic `version`. Drives `ref.updateItem`. */
  collectUpdatedItems: () => DiffCodeViewItem[];
  /** Return the complete ordered item list, bumping the `version` of any item
   *  whose signature changed and dropping bookkeeping for removed files.
   *  Drives `setItems`, which reconciles by id: records for surviving files are
   *  reused (keeping their measured height) and only items with a new `version`
   *  are re-rendered. */
  buildAllItems: () => DiffCodeViewItem[];
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

export interface VersionEntry {
  sig: string;
  n: number;
}

export type VersionMap = Map<string, VersionEntry>;

/**
 * Track ids not seen before at version 0, leaving existing entries untouched.
 * Mutates `versions` and returns the version to emit for each id.
 *
 * Additive on purpose: overwriting a tracked entry's signature with the current
 * one would make the next reconcile compare a signature against itself and skip
 * the bump, so an edited file would keep rendering its stale contents.
 */
export function seedMissingVersions(
  orderedIds: readonly string[],
  computeSig: (id: string) => string,
  versions: VersionMap,
): number[] {
  return orderedIds.map((id) => {
    let entry = versions.get(id);
    if (entry == null) {
      entry = { sig: computeSig(id), n: 0 };
      versions.set(id, entry);
    }
    return entry.n;
  });
}

/**
 * Build the next version map for a full reconcile: ids keep their version when
 * their signature is unchanged (so the viewer reuses the record and its
 * measured height), get a bump when it changed, start at 0 when new, and are
 * dropped when the file is gone.
 */
export function nextVersionMap(
  orderedIds: readonly string[],
  computeSig: (id: string) => string,
  previous: ReadonlyMap<string, VersionEntry>,
): { versions: VersionMap; emitted: number[] } {
  const versions: VersionMap = new Map();
  const emitted = orderedIds.map((id) => {
    const sig = computeSig(id);
    const entry = previous.get(id);
    const n = entry == null ? 0 : entry.sig === sig ? entry.n : entry.n + 1;
    versions.set(id, { sig, n });
    return n;
  });
  return { versions, emitted };
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

  const versionRef = useRef<VersionMap>(new Map());

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

    // Content identity: the git blob ids from the patch's `index` line pin the
    // exact before/after contents. Line counts are the fallback for patches
    // without them — hunk count alone missed edits that reshape a hunk in place.
    const fileDiffSig = fileDiff
      ? `${fileDiff.name}:${fileDiff.type}:${fileDiff.prevObjectId ?? "-"}:${fileDiff.newObjectId ?? "-"}:${fileDiff.hunks.length}:${fileDiff.unifiedLineCount}:${fileDiff.splitLineCount}`
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

  // Seed for the viewer's `initialItems`. Only consumed when `<CodeView>`
  // mounts, but recomputed whenever the files change so a remount (new
  // `diffKey`) always seeds from current data.
  //
  // Version bookkeeping here is deliberately *additive*: ids already tracked
  // keep their stored `{ sig, n }` untouched. Resetting the map instead would
  // overwrite each entry's signature with the current one, so the later
  // reconcile would compare a signature against itself and never bump the
  // version — leaving edited files rendering their stale contents.
  const initialItems = useMemo(() => {
    const ids = allFileDiffs.map((fd) => fd.name);
    const versions = seedMissingVersions(ids, computeSig, versionRef.current);
    const items: DiffCodeViewItem[] = [];
    ids.forEach((id, index) => {
      const item = buildItem(id, versions[index] ?? 0);
      if (item) items.push(item);
    });
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

  const buildAllItems = useCallback((): DiffCodeViewItem[] => {
    // `fileDiffById` is insertion-ordered, so this walks the files in tree
    // order — the order `setItems` will apply.
    const ids = [...latest.current.fileDiffById.keys()];
    const { versions, emitted } = nextVersionMap(ids, computeSig, versionRef.current);
    const items: DiffCodeViewItem[] = [];
    ids.forEach((id, index) => {
      const item = buildItem(id, emitted[index] ?? 0);
      if (item) items.push(item);
    });
    versionRef.current = versions;
    return items;
  }, [computeSig, buildItem]);

  return { filesKey, initialItems, collectUpdatedItems, buildAllItems };
}
