import type { FileReviewState } from "@shared/types.js";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../hooks/useSettings.js";
import { CheckIcon, ChevronIcon, FolderIcon } from "./icons.js";

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

const typeColors: Record<FileInfo["type"], { active: string; muted: string }> = {
  new: { active: "text-green-400/80", muted: "text-green-400/30" },
  deleted: { active: "text-red-400/80", muted: "text-red-400/30" },
  renamed: { active: "text-blue-400/80", muted: "text-blue-400/30" },
  "renamed-changed": { active: "text-blue-400/80", muted: "text-blue-400/30" },
  change: { active: "text-yellow-400/80", muted: "text-yellow-400/30" },
};

const typeLabels: Record<FileInfo["type"], string> = {
  new: "A",
  deleted: "D",
  renamed: "R",
  "renamed-changed": "R",
  change: "M",
};

/* ── Tree node types ── */

interface TreeNode {
  name: string; // segment name (folder or filename)
  fullPath: string; // complete path for folders, or file path for leaves
  children: TreeNode[];
  file: FileInfo | null; // non-null for leaf nodes
}

export function compareByTreeOrder(a: string, b: string): number {
  const pa = a.split("/");
  const pb = b.split("/");
  const len = Math.min(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const lastA = i === pa.length - 1;
    const lastB = i === pb.length - 1;
    if (lastA !== lastB) return lastA ? 1 : -1; // folder before file
    const cmp = pa[i].localeCompare(pb[i]);
    if (cmp !== 0) return cmp;
  }
  return pa.length - pb.length;
}

function buildTree(files: FileInfo[]): TreeNode[] {
  const root: TreeNode = { name: "", fullPath: "", children: [], file: null };

  for (const file of files) {
    const parts = file.name.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const pathSoFar = parts.slice(0, i + 1).join("/");

      if (isFile) {
        current.children.push({
          name: part,
          fullPath: file.name,
          children: [],
          file,
        });
      } else {
        let folder = current.children.find((c) => c.file === null && c.name === part);
        if (!folder) {
          folder = { name: part, fullPath: pathSoFar, children: [], file: null };
          current.children.push(folder);
        }
        current = folder;
      }
    }
  }

  // Sort: folders first, then files, both alphabetically
  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.file && !b.file) return 1;
      if (!a.file && b.file) return -1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) {
      if (n.children.length > 0) sortNodes(n.children);
    }
  }
  sortNodes(root.children);

  return root.children;
}

/* ── File Row (shared between flat and nested) ── */

const FileRow = memo(function FileRow({
  file,
  displayName,
  isSelected,
  isViewed,
  commentCount,
  depth,
  onSelectFile,
  onToggleViewed,
}: {
  file: FileInfo;
  displayName: string;
  isSelected: boolean;
  isViewed: boolean;
  commentCount: number;
  depth: number;
  onSelectFile: (path: string) => void;
  onToggleViewed: (path: string) => void;
}) {
  const handleViewedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleViewed(file.name);
  };

  const handleViewedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      onToggleViewed(file.name);
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelectFile(file.name)}
      className={`group w-full text-left py-1 pr-2 text-[13px] flex items-center gap-1.5 transition-colors ${
        isSelected
          ? "bg-neutral-800/70 text-neutral-100"
          : isViewed
            ? "hover:bg-neutral-800/30"
            : "hover:bg-neutral-800/50"
      }`}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
    >
      {/* Viewed indicator */}
      {/* biome-ignore lint/a11y/useSemanticElements: interactive checkbox nested inside button requires span */}
      <span
        role="checkbox"
        aria-checked={isViewed}
        aria-label="Mark as viewed"
        tabIndex={-1}
        onClick={handleViewedClick}
        onKeyDown={handleViewedKeyDown}
        className={`flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-pointer transition-all ${
          isViewed
            ? "bg-green-500/20 text-green-400/80"
            : "border border-neutral-700 group-hover:border-neutral-500"
        }`}
      >
        {isViewed ? <CheckIcon className="w-2.5 h-2.5" /> : null}
      </span>

      {/* Change type badge */}
      <span
        className={`flex-shrink-0 text-[11px] font-mono font-semibold w-3 text-center ${typeColors[file.type][isViewed ? "muted" : "active"]}`}
      >
        {typeLabels[file.type]}
      </span>

      {/* File name */}
      <span
        className={`truncate font-mono transition-colors ${isViewed ? "text-neutral-600" : "text-neutral-300"}`}
        title={file.name}
      >
        {displayName}
      </span>

      {/* Comment count */}
      {commentCount > 0 ? (
        <span
          className={`ml-auto flex-shrink-0 text-[10px] rounded-full px-1.5 py-px font-mono font-medium ${isViewed ? "bg-neutral-800/60 text-neutral-500" : "bg-neutral-800 text-neutral-400"}`}
        >
          {commentCount}
        </span>
      ) : null}
    </button>
  );
});

/* ── Nested Tree Node ── */

const TreeNodeRow = memo(function TreeNodeRow({
  node,
  depth,
  expandedDirs,
  toggleDir,
  selectedFile,
  reviewFiles,
  onSelectFile,
  onToggleViewed,
}: {
  node: TreeNode;
  depth: number;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
  selectedFile: string | null;
  reviewFiles: Record<string, FileReviewState>;
  onSelectFile: (path: string) => void;
  onToggleViewed: (path: string) => void;
}) {
  if (node.file) {
    const file = node.file;
    const isViewed = reviewFiles[file.name]?.viewed ?? false;
    const commentCount = reviewFiles[file.name]?.comments.length ?? 0;
    return (
      <FileRow
        file={file}
        displayName={node.name}
        isSelected={selectedFile === file.name}
        isViewed={isViewed}
        commentCount={commentCount}
        depth={depth}
        onSelectFile={onSelectFile}
        onToggleViewed={onToggleViewed}
      />
    );
  }

  const isExpanded = expandedDirs.has(node.fullPath);

  return (
    <>
      <button
        type="button"
        onClick={() => toggleDir(node.fullPath)}
        className="w-full text-left py-0.5 pr-2 text-[13px] flex items-center gap-1 hover:bg-neutral-800/50 transition-colors text-neutral-400"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <ChevronIcon expanded={isExpanded} />
        <FolderIcon open={isExpanded} />
        <span className="truncate font-mono text-neutral-400">{node.name}</span>
      </button>
      {isExpanded
        ? node.children.map((child) => (
            <TreeNodeRow
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              selectedFile={selectedFile}
              reviewFiles={reviewFiles}
              onSelectFile={onSelectFile}
              onToggleViewed={onToggleViewed}
            />
          ))
        : null}
    </>
  );
});

/* ── Main Component ── */

export default function FileTree({
  files,
  reviewFiles,
  selectedFile,
  onSelectFile,
  onToggleViewed,
}: FileTreeProps) {
  const {
    state: { nestedTree: nested },
  } = useSettings();
  const [filter, setFilter] = useState("");

  // Expanded dirs state — all expanded by default
  const allDirPaths = useMemo(() => {
    const dirs = new Set<string>();
    for (const file of files) {
      const parts = file.name.split("/");
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join("/"));
      }
    }
    return dirs;
  }, [files]);

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set(allDirPaths));

  // Sync expanded dirs when files change
  useEffect(() => {
    setExpandedDirs((prev) => {
      const merged = new Set(prev);
      for (const d of allDirPaths) merged.add(d);
      return merged;
    });
  }, [allDirPaths]);

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const filteredFiles = useMemo(() => {
    if (!filter) return files;
    const lower = filter.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(lower));
  }, [files, filter]);

  const treeNodes = useMemo(() => {
    return nested ? buildTree(filteredFiles) : [];
  }, [nested, filteredFiles]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b border-neutral-800/40">
        <input
          type="text"
          placeholder="Filter files..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-2 py-1 text-[13px] font-mono bg-neutral-900/60 border border-neutral-800/60 rounded-md focus:outline-none focus:border-neutral-600 text-neutral-200 placeholder-neutral-600 transition-colors"
        />
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto scroll-smooth-y">
        {nested
          ? treeNodes.map((node) => (
              <TreeNodeRow
                key={node.fullPath}
                node={node}
                depth={0}
                expandedDirs={expandedDirs}
                toggleDir={toggleDir}
                selectedFile={selectedFile}
                reviewFiles={reviewFiles}
                onSelectFile={onSelectFile}
                onToggleViewed={onToggleViewed}
              />
            ))
          : filteredFiles.map((file) => {
              const isViewed = reviewFiles[file.name]?.viewed ?? false;
              const commentCount = reviewFiles[file.name]?.comments.length ?? 0;

              return (
                <FileRow
                  key={file.name}
                  file={file}
                  displayName={file.name}
                  isSelected={selectedFile === file.name}
                  isViewed={isViewed}
                  commentCount={commentCount}
                  depth={0}
                  onSelectFile={onSelectFile}
                  onToggleViewed={onToggleViewed}
                />
              );
            })}
      </div>
    </div>
  );
}
