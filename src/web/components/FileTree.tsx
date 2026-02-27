import { useState, useCallback, useMemo } from "react";
import type { FileReviewState } from "@shared/types.js";

interface FileTreeProps {
  files: FileInfo[];
  reviewFiles: Record<string, FileReviewState>;
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
  onToggleViewed: (filePath: string) => void;
}

export interface FileInfo {
  name: string;
  type: "new" | "deleted" | "renamed" | "renamed-changed" | "change";
}

const typeColors: Record<FileInfo["type"], string> = {
  new: "text-green-400",
  deleted: "text-red-400",
  renamed: "text-blue-400",
  "renamed-changed": "text-blue-400",
  change: "text-yellow-400",
};

const typeLabels: Record<FileInfo["type"], string> = {
  new: "A",
  deleted: "D",
  renamed: "R",
  "renamed-changed": "R",
  change: "M",
};

export default function FileTree({
  files,
  reviewFiles,
  selectedFile,
  onSelectFile,
  onToggleViewed,
}: FileTreeProps) {
  const [filter, setFilter] = useState("");

  const filteredFiles = useMemo(() => {
    if (!filter) return files;
    const lower = filter.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(lower));
  }, [files, filter]);

  const viewedCount = useMemo(() => {
    return Object.values(reviewFiles).filter((f) => f.viewed).length;
  }, [reviewFiles]);

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent, filePath: string) => {
      e.stopPropagation();
      onToggleViewed(filePath);
    },
    [onToggleViewed]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b border-neutral-800">
        <input
          type="text"
          placeholder="Filter files..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-2 py-1 text-sm bg-neutral-900 border border-neutral-700 rounded focus:outline-none focus:border-blue-500 text-neutral-200 placeholder-neutral-500"
        />
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {filteredFiles.map((file) => {
          const isSelected = selectedFile === file.name;
          const isViewed = reviewFiles[file.name]?.viewed ?? false;
          const commentCount =
            reviewFiles[file.name]?.comments.length ?? 0;

          return (
            <button
              key={file.name}
              onClick={() => onSelectFile(file.name)}
              className={`w-full text-left px-2 py-1.5 text-sm flex items-center gap-2 hover:bg-neutral-800 transition-colors ${
                isSelected ? "bg-neutral-800" : ""
              }`}
            >
              {/* Viewed checkbox */}
              <span
                onClick={(e) => handleCheckboxClick(e, file.name)}
                className={`flex-shrink-0 w-4 h-4 border rounded-sm flex items-center justify-center cursor-pointer ${
                  isViewed
                    ? "bg-blue-600 border-blue-600"
                    : "border-neutral-600"
                }`}
              >
                {isViewed && (
                  <svg
                    className="w-3 h-3 text-white"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </span>

              {/* Change type badge */}
              <span
                className={`flex-shrink-0 text-xs font-mono font-bold ${typeColors[file.type]}`}
              >
                {typeLabels[file.type]}
              </span>

              {/* File name */}
              <span className="truncate text-neutral-300" title={file.name}>
                {file.name}
              </span>

              {/* Comment count */}
              {commentCount > 0 && (
                <span className="ml-auto flex-shrink-0 text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5">
                  {commentCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer: progress */}
      <div className="p-2 border-t border-neutral-800 text-xs text-neutral-500">
        {viewedCount}/{files.length} files viewed
      </div>
    </div>
  );
}
