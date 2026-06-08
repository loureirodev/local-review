import type { DiffLineAnnotation, FileDiffMetadata } from "@pierre/diffs/react";
import { FileDiff } from "@pierre/diffs/react";
import type { ReviewComment } from "@shared/types.js";
import { memo, useCallback } from "react";
import { getFileSectionId } from "../diffNavigation";
import { THEME } from "./constants";
import type { CommentAnnotation, HoverUtilityRenderer } from "./diffParsing";
import { FileCommentBadge, HeaderChevron, ViewedToggle } from "./HeaderControls";

interface FileDiffSectionProps {
  fileDiff: FileDiffMetadata;
  isSelected: boolean;
  isCollapsed: boolean;
  isViewed: boolean;
  fileComments: ReviewComment[];
  diffStyle: "split" | "unified";
  wrapLines: boolean;
  showLineNumbers: boolean;
  fontSize: number;
  lineHeight: number;
  lineAnnotations: DiffLineAnnotation<CommentAnnotation>[];
  renderAnnotation: (annotation: DiffLineAnnotation<CommentAnnotation>) => React.ReactNode;
  onToggleCollapse: (filePath: string) => void;
  onToggleViewed: (filePath: string) => void;
  onRequestLineComment: (filePath: string, line: number, side: "addition" | "deletion") => void;
  onOpenDrawer: (filePath: string, showInput: boolean) => void;
}

export const FileDiffSection = memo(function FileDiffSection({
  fileDiff,
  isSelected,
  isCollapsed,
  isViewed,
  fileComments,
  diffStyle,
  wrapLines,
  showLineNumbers,
  fontSize,
  lineHeight,
  lineAnnotations,
  renderAnnotation,
  onToggleCollapse,
  onToggleViewed,
  onRequestLineComment,
  onOpenDrawer,
}: FileDiffSectionProps) {
  const filePath = fileDiff.name;
  const sectionId = getFileSectionId(filePath);

  const handleToggleCollapse = useCallback(() => {
    onToggleCollapse(filePath);
  }, [filePath, onToggleCollapse]);

  const handleToggleViewed = useCallback(() => {
    onToggleViewed(filePath);
  }, [filePath, onToggleViewed]);

  const renderHoverUtility = useCallback<HoverUtilityRenderer>(
    (getHoveredLine) => (
      <button
        type="button"
        onClick={() => {
          const hovered = getHoveredLine();
          if (!hovered) return;
          onRequestLineComment(
            filePath,
            hovered.lineNumber,
            hovered.side === "deletions" ? "deletion" : "addition",
          );
        }}
        className="absolute -left-2 top-1/2 -translate-y-1/2 size-6 bg-neutral-700/90 hover:bg-neutral-600 text-neutral-300 hover:text-neutral-100 rounded-full flex items-center justify-center text-lg shadow-lg shadow-black/30 z-10 transition-colors border border-neutral-600/50"
        title="Add comment"
      >
        +
      </button>
    ),
    [filePath, onRequestLineComment],
  );

  const renderHeaderPrefix = useCallback(
    () => <HeaderChevron collapsed={isCollapsed} onClick={handleToggleCollapse} />,
    [isCollapsed, handleToggleCollapse],
  );

  const commentCount = fileComments.length;
  const renderHeaderMetadata = useCallback(
    () => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <FileCommentBadge
          count={commentCount}
          onClick={() => onOpenDrawer(filePath, commentCount === 0)}
        />
        <ViewedToggle viewed={isViewed} onClick={handleToggleViewed} />
      </span>
    ),
    [commentCount, filePath, isViewed, onOpenDrawer, handleToggleViewed],
  );

  return (
    <section
      id={sectionId}
      data-file-path={filePath}
      className={`border-b border-neutral-800/70 ${isSelected ? "bg-blue-500/5" : ""}`}
    >
      <FileDiff
        fileDiff={fileDiff}
        options={{
          diffStyle,
          theme: THEME,
          themeType: "dark",
          lineDiffType: "word",
          overflow: wrapLines ? "wrap" : "scroll",
          disableLineNumbers: !showLineNumbers,
          expandUnchanged: true,
          enableHoverUtility: true,
          collapsed: isCollapsed,
          disableVirtualizationBuffers: true,
          unsafeCSS: `
            :host {
              --diffs-font-size: ${fontSize}px;
              --diffs-line-height: ${lineHeight}px;
              --diffs-font-family: var(--font-mono);
              --diffs-header-font-family: var(--font-mono);
            }
            /* Default is "overflow: scroll clip", which always shows the
               horizontal scrollbar even when content fits or wrap is enabled.
               Override: hidden when wrapping (no scroll possible), auto when
               not (only when content actually overflows). */
            [data-code] {
              overflow-x: ${wrapLines ? "hidden" : "auto"} !important;
            }
          `,
        }}
        lineAnnotations={lineAnnotations}
        renderAnnotation={renderAnnotation}
        renderHoverUtility={renderHoverUtility}
        renderHeaderPrefix={renderHeaderPrefix}
        renderHeaderMetadata={renderHeaderMetadata}
      />
    </section>
  );
});
