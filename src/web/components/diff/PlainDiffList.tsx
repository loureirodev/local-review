import { useEffect, useRef, useState } from "react";
import { getFileSectionId } from "../diffNavigation";
import { computeHeaderHeight } from "./constants";
import type { DiffListProps } from "./diffListShared";
import { EMPTY_ANNOTATIONS, EMPTY_COMMENTS } from "./diffParsing";
import { FileDiffSection } from "./FileDiffSection";
import { FloatingFileIndicator } from "./FloatingFileIndicator";
import { usePinnedFile } from "./usePinnedFile";

export function PlainDiffList({
  allFileDiffs,
  summaryByFile,
  lineAnnotationsByFile,
  fileLevelCommentsByFile,
  reviewFiles,
  selectedFile,
  navigationTargetFile,
  onNavigationHandled,
  diffStyle,
  wrapLines,
  showLineNumbers,
  fontSize,
  lineHeight,
  getIsCollapsed,
  onToggleCollapse,
  onToggleViewed,
  onRequestLineComment,
  onOpenDrawer,
  renderAnnotation,
}: DiffListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerHeight = computeHeaderHeight(lineHeight);
  const getIsCollapsedRef = useRef(getIsCollapsed);
  useEffect(() => {
    getIsCollapsedRef.current = getIsCollapsed;
  });

  useEffect(() => {
    if (!navigationTargetFile) return;
    const sectionId = getFileSectionId(navigationTargetFile);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    onNavigationHandled(navigationTargetFile);
  }, [navigationTargetFile, onNavigationHandled]);

  const [pinnedFile, setPinnedFile] = useState<string | null>(null);
  const displayedPinnedFile = usePinnedFile(pinnedFile);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || allFileDiffs.length === 0) return;

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const containerTop = el.getBoundingClientRect().top;

        let found: string | null = null;
        for (const fd of allFileDiffs) {
          if (getIsCollapsedRef.current(fd.name)) continue;
          const section = document.getElementById(getFileSectionId(fd.name));
          if (!section) continue;
          const rect = section.getBoundingClientRect();
          const top = rect.top - containerTop;
          const bottom = rect.bottom - containerTop;
          if (top + headerHeight <= 0 && bottom > headerHeight) {
            found = fd.name;
            break;
          }
        }

        setPinnedFile((current) => (current === found ? current : found));
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [allFileDiffs, headerHeight]);

  const displayedFile = displayedPinnedFile
    ? (allFileDiffs.find((fd) => fd.name === displayedPinnedFile) ?? null)
    : null;
  const displayedSummary = displayedFile ? summaryByFile.get(displayedFile.name) : undefined;

  return (
    <div className="relative h-full">
      {displayedFile && (
        <FloatingFileIndicator
          key={displayedFile.name}
          fileDiff={displayedFile}
          additions={displayedSummary?.additions ?? 0}
          deletions={displayedSummary?.deletions ?? 0}
          state={pinnedFile === displayedFile.name ? "open" : "closed"}
        />
      )}
      <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden scroll-smooth">
        {allFileDiffs.map((fileDiff) => {
          const fileComments = fileLevelCommentsByFile.get(fileDiff.name) ?? EMPTY_COMMENTS;
          return (
            <FileDiffSection
              key={fileDiff.name}
              fileDiff={fileDiff}
              isSelected={selectedFile === fileDiff.name}
              isCollapsed={getIsCollapsed(fileDiff.name)}
              isViewed={reviewFiles[fileDiff.name]?.viewed ?? false}
              fileComments={fileComments}
              diffStyle={diffStyle}
              wrapLines={wrapLines}
              showLineNumbers={showLineNumbers}
              fontSize={fontSize}
              lineHeight={lineHeight}
              lineAnnotations={lineAnnotationsByFile.get(fileDiff.name) ?? EMPTY_ANNOTATIONS}
              renderAnnotation={renderAnnotation}
              onToggleCollapse={onToggleCollapse}
              onToggleViewed={onToggleViewed}
              onRequestLineComment={onRequestLineComment}
              onOpenDrawer={onOpenDrawer}
            />
          );
        })}
      </div>
    </div>
  );
}
