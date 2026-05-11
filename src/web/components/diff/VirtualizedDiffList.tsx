import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { computeHeaderHeight, MAX_ESTIMATED_LINES } from "./constants";
import type { DiffListProps } from "./diffListShared";
import { EMPTY_ANNOTATIONS, EMPTY_COMMENTS } from "./diffParsing";
import { FileDiffSection } from "./FileDiffSection";
import { FloatingFileIndicator } from "./FloatingFileIndicator";
import { usePinnedFile } from "./usePinnedFile";

export function VirtualizedDiffList({
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

  const virtualizer = useVirtualizer({
    count: allFileDiffs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const fileDiff = allFileDiffs[index];
      if (getIsCollapsed(fileDiff.name)) {
        return headerHeight;
      }
      const summary = summaryByFile.get(fileDiff.name);
      const lines = summary ? Math.min(summary.lines, MAX_ESTIMATED_LINES) : 0;
      return headerHeight + lines * lineHeight;
    },
    overscan: 3,
  });

  // Force re-estimation when collapse state or header height changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: getIsCollapsed is the trigger
  useEffect(() => {
    virtualizer.measure();
  }, [getIsCollapsed, headerHeight, virtualizer]);

  // Navigation: scroll to target then re-scroll until the item's measured
  // position is stable. estimateSize is approximate (Shiki renders async), so
  // a single scrollToIndex call lands at the wrong offset — measurement shifts
  // the item afterward. Loop in rAF until scrollTop matches item.start.
  useEffect(() => {
    if (!navigationTargetFile) return;

    const fileIndex = allFileDiffs.findIndex((fd) => fd.name === navigationTargetFile);
    if (fileIndex === -1) {
      onNavigationHandled(navigationTargetFile);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    const settle = () => {
      if (cancelled) return;
      attempts++;
      virtualizer.scrollToIndex(fileIndex, { align: "start" });

      requestAnimationFrame(() => {
        if (cancelled) return;
        const el = scrollRef.current;
        const items = virtualizer.getVirtualItems();
        const target = items.find((i) => i.index === fileIndex);

        if (!el || !target) {
          if (attempts >= MAX_ATTEMPTS) {
            onNavigationHandled(navigationTargetFile);
            return;
          }
          settle();
          return;
        }

        const delta = Math.abs(el.scrollTop - target.start);
        if (delta < 2 || attempts >= MAX_ATTEMPTS) {
          onNavigationHandled(navigationTargetFile);
          return;
        }
        settle();
      });
    };

    settle();

    return () => {
      cancelled = true;
    };
  }, [navigationTargetFile, allFileDiffs, virtualizer, onNavigationHandled]);

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
        const scrollTop = el.scrollTop;

        let found: string | null = null;
        for (const item of virtualizer.getVirtualItems()) {
          if (item.start <= scrollTop && scrollTop < item.start + item.size) {
            const fileDiff = allFileDiffs[item.index];
            if (fileDiff && !getIsCollapsedRef.current(fileDiff.name)) {
              const headerBottom = item.start + headerHeight;
              if (headerBottom <= scrollTop && item.start + item.size > scrollTop + headerHeight) {
                found = fileDiff.name;
              }
            }
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
  }, [allFileDiffs, headerHeight, virtualizer]);

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
      <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const fileDiff = allFileDiffs[item.index];
            const fileComments = fileLevelCommentsByFile.get(fileDiff.name) ?? EMPTY_COMMENTS;

            return (
              <div
                key={fileDiff.name}
                ref={virtualizer.measureElement}
                data-index={item.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <FileDiffSection
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
