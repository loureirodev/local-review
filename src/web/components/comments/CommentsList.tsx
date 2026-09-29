import type { DiffSource } from "@shared/types";
import { useEffect, useMemo, useRef } from "react";
import { RowButton } from "../Button";
import CommentNavCard from "./CommentNavCard";
import type { IndexedComment } from "./useCommentIndex";

interface CommentsListProps {
  /** The filtered comments, in index order. */
  comments: IndexedComment[];
  /** How many comments the review has, filter aside. */
  total: number;
  query: string;
  source: DiffSource | null;
  currentCommentId: string | null;
  /** Hidden views stay mounted; the current card is scrolled to once shown. */
  hidden: boolean;
  onSelectComment: (entry: IndexedComment) => void;
  onSelectFile: (filePath: string) => void;
}

interface FileGroup {
  filePath: string;
  comments: IndexedComment[];
}

function groupByFile(comments: IndexedComment[]): FileGroup[] {
  const groups: FileGroup[] = [];
  for (const entry of comments) {
    const last = groups.at(-1);
    if (last?.filePath === entry.comment.filePath) last.comments.push(entry);
    else groups.push({ filePath: entry.comment.filePath, comments: [entry] });
  }
  return groups;
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-[13px] text-muted">{title}</p>
      <p className="text-[11px] text-faint mt-1">{hint}</p>
    </div>
  );
}

/** The sidebar's Comments view: the review's comments grouped by file. */
export default function CommentsList({
  comments,
  total,
  query,
  source,
  currentCommentId,
  hidden,
  onSelectComment,
  onSelectFile,
}: CommentsListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupByFile(comments), [comments]);

  // A plain scroller, not CodeView: measuring here can't disturb the viewer.
  useEffect(() => {
    if (hidden || !currentCommentId) return;
    const escaped = CSS.escape(currentCommentId);
    listRef.current
      ?.querySelector(`[data-nav-comment-id="${escaped}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [currentCommentId, hidden]);

  let content: React.ReactNode;
  if (total === 0) {
    content = (
      <EmptyState
        title="No comments yet"
        hint="Comments added in the diff, or imported from a review, are listed here."
      />
    );
  } else if (groups.length === 0) {
    content = <EmptyState title="No matching comments" hint="Press Esc to clear the search." />;
  } else {
    content = groups.map(({ filePath, comments: fileComments }) => {
      const slash = filePath.lastIndexOf("/");
      const name = filePath.slice(slash + 1);
      const dir = slash === -1 ? "" : filePath.slice(0, slash);
      return (
        <section key={filePath} className="border-b border-hair">
          <RowButton
            className="flex items-baseline gap-1.5 px-2.5 py-1.5 bg-bg sticky top-0 z-10"
            onClick={() => onSelectFile(filePath)}
            title={filePath}
          >
            <span className="text-xs text-text truncate flex-shrink-0 max-w-[70%]">{name}</span>
            <span className="text-[11px] text-faint truncate flex-1 min-w-0" dir="rtl">
              {/* rtl keeps the nearest folders visible when the path is cut. */}
              <bdi>{dir}</bdi>
            </span>
            <span className="text-[11px] text-faint tabular-nums">{fileComments.length}</span>
          </RowButton>
          {fileComments.map((entry) => (
            <CommentNavCard
              key={entry.comment.id}
              entry={entry}
              source={source}
              query={query}
              current={entry.comment.id === currentCommentId}
              onSelect={onSelectComment}
            />
          ))}
        </section>
      );
    });
  }

  return (
    <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto scroll-smooth-y">
      {content}
    </div>
  );
}
