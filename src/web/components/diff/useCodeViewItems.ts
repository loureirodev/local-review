import type {
  CodeViewItem,
  DiffLineAnnotation,
  FileContents,
  LineAnnotation,
} from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import { useCallback, useMemo, useRef } from "react";
import type {
  CommentAnnotation,
  CommentLineAnnotation,
  FolderFileState,
  ViewerEntry,
} from "./diffParsing";
import { EMPTY_ANNOTATIONS, entryName } from "./diffParsing";

export type DiffCodeViewItem = CodeViewItem<CommentAnnotation>;

interface UseCodeViewItemsParams {
  entries: ViewerEntry[];
  lineAnnotationsByFile: Map<string, CommentLineAnnotation[]>;
  fileLevelCommentsByFile: Map<string, ReviewComment[]>;
  reviewFiles: Record<string, FileReviewState>;
  getIsCollapsed: (filePath: string) => boolean;
  getPreview: (filePath: string) => string | null;
}

export interface CodeViewItemsResult {
  /** Changes when the file set changes (membership or order), signalling that
   *  a targeted `updateItem` pass is no longer enough and the viewer needs a
   *  full `setItems` reconcile. */
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

/** Render identity of an entry's content, folded into its signature. */
export function contentSig(entry: ViewerEntry | undefined): string {
  if (!entry) return "none";
  if (entry.type === "file") {
    // Folder contents are fetched once per session and never change after,
    // so the load state and length identify them without hashing.
    const file = entry.file;
    if (!file) return `file:${entry.name}:pending`;
    return file.status === "loaded"
      ? `file:${entry.name}:loaded:${file.content.length}`
      : `file:${entry.name}:error:${file.message}`;
  }
  // Content identity: the git blob ids from the patch's `index` line pin the
  // exact before/after contents. Line counts are the fallback for patches
  // without them — hunk count alone missed edits that reshape a hunk in place.
  const fd = entry.fileDiff;
  return `${fd.name}:${fd.type}:${fd.prevObjectId ?? "-"}:${fd.newObjectId ?? "-"}:${fd.hunks.length}:${fd.unifiedLineCount}:${fd.splitLineCount}`;
}

/** What a folder file item renders: its text, a placeholder while loading, or
 *  the reason it cannot be shown (plain text, so it isn't highlighted as code). */
export function fileContents(name: string, file: FolderFileState | undefined): FileContents {
  if (!file) return { name, contents: "", lang: "text" };
  if (file.status === "error") return { name, contents: file.message, lang: "text" };
  return { name, contents: file.content };
}

/**
 * Maps viewer entries (file diffs, or raw folder files) to CodeView items and
 * owns the per-item `version` signature (D4). Render-affecting state (collapsed,
 * viewed, comments, and the underlying content) is folded into a string `sig`;
 * when it changes, `version` is bumped and the item re-emitted so the viewer
 * refreshes only that item via `updateItem` without recreating the list (D2).
 */
export function useCodeViewItems({
  entries,
  lineAnnotationsByFile,
  fileLevelCommentsByFile,
  reviewFiles,
  getIsCollapsed,
  getPreview,
}: UseCodeViewItemsParams): CodeViewItemsResult {
  const entryById = useMemo(() => {
    const map = new Map<string, ViewerEntry>();
    for (const entry of entries) map.set(entryName(entry), entry);
    return map;
  }, [entries]);

  const filesKey = useMemo(() => entries.map(entryName).join("\n"), [entries]);

  // Latest render inputs, read by the sig/item builders (which run inside an
  // effect, after render). Keeps the builders pointed at fresh data without
  // recreating callbacks on every keystroke.
  const latest = useRef({
    entryById,
    lineAnnotationsByFile,
    fileLevelCommentsByFile,
    reviewFiles,
    getIsCollapsed,
    getPreview,
  });
  latest.current = {
    entryById,
    lineAnnotationsByFile,
    fileLevelCommentsByFile,
    reviewFiles,
    getIsCollapsed,
    getPreview,
  };

  const versionRef = useRef<VersionMap>(new Map());

  const computeSig = useCallback((id: string): string => {
    const {
      entryById: byId,
      lineAnnotationsByFile: lineMap,
      fileLevelCommentsByFile: fileMap,
      reviewFiles: review,
      getIsCollapsed: isCollapsed,
      getPreview: previewOf,
    } = latest.current;
    const entry = byId.get(id);
    const collapsed = isCollapsed(id) ? 1 : 0;
    const preview = previewOf(id) === null ? 0 : 1;
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

    return `${collapsed}|${viewed}|${preview}|${contentSig(entry)}|${parts.join(",")}`;
  }, []);

  const buildItem = useCallback((id: string, version: number): DiffCodeViewItem | undefined => {
    const {
      entryById: byId,
      lineAnnotationsByFile: lineMap,
      reviewFiles: review,
      getIsCollapsed: isCollapsed,
      getPreview: previewOf,
    } = latest.current;
    const entry = byId.get(id);
    if (!entry) return undefined;
    const annotations = lineMap.get(id) ?? EMPTY_ANNOTATIONS;
    const preview = previewOf(id);
    if (preview !== null) {
      // CodeView only renders code, so the preview travels as the file-level
      // annotation (line 0) of an otherwise empty file item.
      return {
        id,
        type: "file",
        file: { name: id, contents: "", lang: "text" },
        annotations: [
          {
            lineNumber: 0,
            metadata: {
              // Every line comment, including those the source view can't
              // anchor (past the end of the file): the preview places each by line.
              comments: (review[id]?.comments ?? []).filter((comment) => comment.line !== null),
              preview,
            },
          },
        ],
        collapsed: isCollapsed(id),
        version,
      };
    }
    if (entry.type === "diff") {
      return {
        id,
        type: "diff",
        fileDiff: entry.fileDiff,
        annotations: annotations as DiffLineAnnotation<CommentAnnotation>[],
        collapsed: isCollapsed(id),
        version,
      };
    }
    return {
      id,
      type: "file",
      file: fileContents(id, entry.file),
      annotations: annotations as LineAnnotation<CommentAnnotation>[],
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
    const ids = entries.map(entryName);
    const versions = seedMissingVersions(ids, computeSig, versionRef.current);
    const items: DiffCodeViewItem[] = [];
    ids.forEach((id, index) => {
      const item = buildItem(id, versions[index] ?? 0);
      if (item) items.push(item);
    });
    return items;
  }, [entries, computeSig, buildItem]);

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
    // `entryById` is insertion-ordered, so this walks the files in tree
    // order — the order `setItems` will apply.
    const ids = [...latest.current.entryById.keys()];
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
