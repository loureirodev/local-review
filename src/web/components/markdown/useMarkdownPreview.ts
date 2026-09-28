import { useCallback, useMemo, useState } from "react";
import type { ViewerEntry } from "../diff/diffParsing";

const MARKDOWN_PATH = /\.(md|markdown)$/i;

/**
 * Which folder markdown files are shown rendered. Diffs stay as code: a hunk
 * can start inside a list or code fence, so it can't render faithfully alone.
 */
export function useMarkdownPreview(entries: ViewerEntry[]) {
  const [sourceFiles, setSourceFiles] = useState<ReadonlySet<string>>(() => new Set());

  const previewable = useMemo(() => {
    const map = new Map<string, Extract<ViewerEntry, { type: "file" }>>();
    for (const entry of entries) {
      if (entry.type === "file" && MARKDOWN_PATH.test(entry.name)) map.set(entry.name, entry);
    }
    return map;
  }, [entries]);

  const setPreview = useCallback((filePath: string, preview: boolean) => {
    setSourceFiles((prev) => {
      if (prev.has(filePath) === !preview) return prev;
      const next = new Set(prev);
      if (preview) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  }, []);

  /** The file's content to render, or null while it shows as code. */
  const getPreview = useCallback(
    (filePath: string): string | null => {
      if (sourceFiles.has(filePath)) return null;
      const file = previewable.get(filePath)?.file;
      // Until the file arrives, its section shows the usual loading state.
      if (file?.status !== "loaded") return null;
      return file.content;
    },
    [previewable, sourceFiles],
  );

  return { previewable, sourceFiles, setPreview, getPreview };
}
