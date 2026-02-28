import type { FileReviewState } from "@shared/types.js";
import { useCallback, useMemo, useState } from "react";

interface FileTreeProps {
  files: FileInfo[];
  reviewFiles: Record<string, FileReviewState>;
  selectedFile: string | null;
  nested: boolean;
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

/* ── SVG Icons ── */

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
    >
      <path d="M4 2l4 4-4 4" />
    </svg>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={open ? "text-blue-400/80" : "text-neutral-500"}
    >
      {open ? (
        <path d="M2 4v8a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H8L6.5 3.5A1 1 0 005.8 3H3a1 1 0 00-1 1z" />
      ) : (
        <path
          d="M2 4v8a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H8L6.5 3.5A1 1 0 005.8 3H3a1 1 0 00-1 1z"
          fill="currentColor"
          fillOpacity="0.15"
        />
      )}
    </svg>
  );
}

/* ── Tree node types ── */

interface TreeNode {
  name: string; // segment name (folder or filename)
  fullPath: string; // complete path for folders, or file path for leaves
  children: TreeNode[];
  file: FileInfo | null; // non-null for leaf nodes
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

function FileRow({
  file,
  displayName,
  isSelected,
  isViewed,
  commentCount,
  depth,
  onSelect,
  onToggleViewed,
}: {
  file: FileInfo;
  displayName: string;
  isSelected: boolean;
  isViewed: boolean;
  commentCount: number;
  depth: number;
  onSelect: () => void;
  onToggleViewed: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left py-1 pr-2 text-[13px] flex items-center gap-1.5 hover:bg-neutral-800/70 transition-colors ${
        isSelected ? "bg-neutral-800 text-neutral-100" : ""
      }`}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
    >
      {/* Viewed checkbox */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: checkbox inside button, click handled by parent */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard access via outer button */}
      <span
        onClick={onToggleViewed}
        className={`flex-shrink-0 w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center cursor-pointer transition-colors ${
          isViewed ? "bg-blue-600 border-blue-600" : "border-neutral-600 hover:border-neutral-400"
        }`}
      >
        {isViewed && (
          <svg
            aria-hidden="true"
            className="w-2.5 h-2.5 text-white"
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
        className={`flex-shrink-0 text-[11px] font-mono font-semibold w-3 text-center ${typeColors[file.type]}`}
      >
        {typeLabels[file.type]}
      </span>

      {/* File name */}
      <span className="truncate font-mono text-neutral-300" title={file.name}>
        {displayName}
      </span>

      {/* Comment count */}
      {commentCount > 0 && (
        <span className="ml-auto flex-shrink-0 text-[10px] bg-blue-600/80 text-white rounded-full px-1.5 py-px font-medium">
          {commentCount}
        </span>
      )}
    </button>
  );
}

/* ── Nested Tree Node ── */

function TreeNodeRow({
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
        onSelect={() => onSelectFile(file.name)}
        onToggleViewed={(e) => {
          e.stopPropagation();
          onToggleViewed(file.name);
        }}
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
      {isExpanded &&
        node.children.map((child) => (
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
        ))}
    </>
  );
}

/* ── Main Component ── */

export default function FileTree({
  files,
  reviewFiles,
  selectedFile,
  nested,
  onSelectFile,
  onToggleViewed,
}: FileTreeProps) {
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
  useMemo(() => {
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

  const viewedCount = useMemo(() => {
    return Object.values(reviewFiles).filter((f) => f.viewed).length;
  }, [reviewFiles]);

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent, filePath: string) => {
      e.stopPropagation();
      onToggleViewed(filePath);
    },
    [onToggleViewed],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b border-neutral-800/60">
        <input
          type="text"
          placeholder="Filter files..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-2 py-1 text-[13px] font-mono bg-neutral-900 border border-neutral-700/60 rounded focus:outline-none focus:border-blue-500/80 text-neutral-200 placeholder-neutral-500"
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
                  onSelect={() => onSelectFile(file.name)}
                  onToggleViewed={(e) => handleCheckboxClick(e, file.name)}
                />
              );
            })}
      </div>

      {/* Footer: progress */}
      <div className="px-2 py-1.5 border-t border-neutral-800/60 text-[11px] text-neutral-500 font-mono">
        {viewedCount}/{files.length} reviewed
      </div>
    </div>
  );
}
