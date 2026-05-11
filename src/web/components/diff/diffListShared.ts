import type { DiffLineAnnotation, FileDiffMetadata } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import type { CommentAnnotation, FileDiffSummary } from "./diffParsing.js";

export interface DiffListProps {
  allFileDiffs: FileDiffMetadata[];
  summaryByFile: Map<string, FileDiffSummary>;
  lineAnnotationsByFile: Map<string, DiffLineAnnotation<CommentAnnotation>[]>;
  fileLevelCommentsByFile: Map<string, ReviewComment[]>;
  reviewFiles: Record<string, FileReviewState>;
  selectedFile: string | null;
  navigationTargetFile: string | null;
  onNavigationHandled: (filePath: string) => void;
  diffStyle: "split" | "unified";
  wrapLines: boolean;
  showLineNumbers: boolean;
  fontSize: number;
  lineHeight: number;
  getIsCollapsed: (filePath: string) => boolean;
  onToggleCollapse: (filePath: string) => void;
  onToggleViewed: (filePath: string) => void;
  onRequestLineComment: (filePath: string, line: number, side: "addition" | "deletion") => void;
  onOpenDrawer: (filePath: string, showInput: boolean) => void;
  renderAnnotation: (annotation: DiffLineAnnotation<CommentAnnotation>) => React.ReactNode;
}
