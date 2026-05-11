import type { DiffLineAnnotation } from "@pierre/diffs/react";
import { WorkerPoolContextProvider } from "@pierre/diffs/react";
import type { FileReviewState, ReviewComment } from "@shared/types.js";
import { useCallback, useState } from "react";
import { useCollapse } from "../context/CollapseContext";
import { useReview } from "../context/ReviewContext";
import { useSettings } from "../hooks/useSettings";
import CommentDisplay from "./CommentDisplay";
import { type ActiveInput, CommentInputOverlay } from "./diff/CommentInputOverlay";
import {
  HIGHLIGHTER_OPTIONS,
  VIRTUALIZATION_THRESHOLD,
  WORKER_POOL_OPTIONS,
} from "./diff/constants";
import type { CommentAnnotation } from "./diff/diffParsing";
import { EMPTY_COMMENTS } from "./diff/diffParsing";
import { PlainDiffList } from "./diff/PlainDiffList";
import { useDiffData } from "./diff/useDiffData";
import { VirtualizedDiffList } from "./diff/VirtualizedDiffList";
import FileCommentsDrawer from "./FileCommentsDrawer";

interface DiffViewerProps {
  patch: string;
  selectedFile: string | null;
  navigationTargetFile: string | null;
  reviewFiles: Record<string, FileReviewState>;
  onNavigationHandled: (filePath: string) => void;
  onAddComment: (comment: ReviewComment) => void;
  onDeleteComment: (filePath: string, commentId: string) => void;
  onUpdateComment: (filePath: string, commentId: string, body: string) => void;
}

function DiffViewerInner({
  patch,
  selectedFile,
  navigationTargetFile,
  reviewFiles,
  onNavigationHandled,
  onAddComment,
  onDeleteComment,
  onUpdateComment,
}: DiffViewerProps) {
  const {
    state: { diffStyle, wrapLines, showLineNumbers, fontSize, lineHeight },
  } = useSettings();
  const {
    state: { source },
    toggleViewed,
  } = useReview();
  const { getIsCollapsed, toggleFile } = useCollapse();

  const {
    allFileDiffs,
    summaryByFile,
    totalLines,
    lineAnnotationsByFile,
    fileLevelCommentsByFile,
  } = useDiffData(patch, reviewFiles);

  const [activeInput, setActiveInput] = useState<ActiveInput | null>(null);
  const [drawerState, setDrawerState] = useState<{
    filePath: string;
    showInput: boolean;
  } | null>(null);

  const handleAddComment = useCallback(
    (comment: ReviewComment) => {
      onAddComment(comment);
      setActiveInput(null);
    },
    [onAddComment],
  );

  const renderAnnotation = useCallback(
    (annotation: DiffLineAnnotation<CommentAnnotation>) => {
      if (!annotation.metadata) return null;
      return (
        <div className="border-t border-neutral-800/40">
          {annotation.metadata.comments.map((comment) => (
            <CommentDisplay
              key={comment.id}
              comment={comment}
              source={source}
              onDelete={(id) => onDeleteComment(comment.filePath, id)}
              onUpdate={(id, body) => onUpdateComment(comment.filePath, id, body)}
            />
          ))}
        </div>
      );
    },
    [source, onDeleteComment, onUpdateComment],
  );

  const openDrawer = useCallback((filePath: string, showInput = false) => {
    setDrawerState({ filePath, showInput });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerState(null);
  }, []);

  const requestLineComment = useCallback(
    (filePath: string, line: number, side: "addition" | "deletion") => {
      setActiveInput({ filePath, line, side });
    },
    [],
  );

  const handleToggleFile = useCallback((filePath: string) => toggleFile(filePath), [toggleFile]);
  const handleToggleViewed = useCallback(
    (filePath: string) => toggleViewed(filePath),
    [toggleViewed],
  );

  if (!patch || !allFileDiffs || allFileDiffs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        <div className="text-center">
          <p className="text-lg">No changes found</p>
          <p className="text-sm mt-1">Try a different diff mode</p>
        </div>
      </div>
    );
  }

  const drawerComments = drawerState
    ? (fileLevelCommentsByFile.get(drawerState.filePath) ?? EMPTY_COMMENTS)
    : EMPTY_COMMENTS;

  const useVirtualization = totalLines > VIRTUALIZATION_THRESHOLD;
  const ListComponent = useVirtualization ? VirtualizedDiffList : PlainDiffList;

  return (
    <>
      <ListComponent
        allFileDiffs={allFileDiffs}
        summaryByFile={summaryByFile}
        lineAnnotationsByFile={lineAnnotationsByFile}
        fileLevelCommentsByFile={fileLevelCommentsByFile}
        reviewFiles={reviewFiles}
        selectedFile={selectedFile}
        navigationTargetFile={navigationTargetFile}
        onNavigationHandled={onNavigationHandled}
        diffStyle={diffStyle}
        wrapLines={wrapLines}
        showLineNumbers={showLineNumbers}
        fontSize={fontSize}
        lineHeight={lineHeight}
        getIsCollapsed={getIsCollapsed}
        onToggleCollapse={handleToggleFile}
        onToggleViewed={handleToggleViewed}
        onRequestLineComment={requestLineComment}
        onOpenDrawer={openDrawer}
        renderAnnotation={renderAnnotation}
      />

      <FileCommentsDrawer
        filePath={drawerState?.filePath ?? null}
        comments={drawerComments}
        source={source}
        showInput={drawerState?.showInput ?? false}
        onClose={closeDrawer}
        onAddComment={onAddComment}
        onDeleteComment={onDeleteComment}
        onUpdateComment={onUpdateComment}
      />

      {activeInput && (
        <CommentInputOverlay
          activeInput={activeInput}
          onSubmit={handleAddComment}
          onCancel={() => setActiveInput(null)}
        />
      )}
    </>
  );
}

export default function DiffViewer(props: DiffViewerProps) {
  return (
    <WorkerPoolContextProvider
      poolOptions={WORKER_POOL_OPTIONS}
      highlighterOptions={HIGHLIGHTER_OPTIONS}
    >
      <DiffViewerInner {...props} />
    </WorkerPoolContextProvider>
  );
}
