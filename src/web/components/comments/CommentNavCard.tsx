import type { DiffSource } from "@shared/types";
import { memo, type ReactNode } from "react";
import { relativeTime } from "../../utils/relativeTime";
import { RowButton } from "../Button";
import { MinusIcon, PlusIcon } from "../icons";
import { OriginIcon } from "../OriginIcon";
import type { IndexedComment } from "./useCommentIndex";

const SIDE_ICON_SIZE = 10;

/** `text` with each case-insensitive occurrence of `query` marked. */
function highlight(text: string, query: string): ReactNode {
  const needle = query.trim().toLowerCase();
  if (!needle) return text;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, from)) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className="bg-accent-tint text-text rounded-sm">
        {text.slice(at, at + needle.length)}
      </mark>,
    );
    from = at + needle.length;
  }
  parts.push(text.slice(from));
  return parts;
}

function Location({ entry }: { entry: IndexedComment }) {
  const { comment, kind } = entry;
  if (kind === "file" || comment.line === null) return <span>File</span>;
  return (
    <span className="inline-flex items-center gap-1">
      L{comment.line}
      {comment.side === "addition" ? (
        <PlusIcon size={SIDE_ICON_SIZE} className="text-success" />
      ) : comment.side === "deletion" ? (
        <MinusIcon size={SIDE_ICON_SIZE} className="text-danger" />
      ) : null}
      {kind === "orphan" ? <span className="text-faint italic">· line gone</span> : null}
    </span>
  );
}

interface CommentNavCardProps {
  entry: IndexedComment;
  source: DiffSource | null;
  query: string;
  current: boolean;
  onSelect: (entry: IndexedComment) => void;
}

/** A read-only comment in the navigator. The origin link sits beside the row
 *  button, not inside it: a link can't nest in a button. */
export default memo(function CommentNavCard({
  entry,
  source,
  query,
  current,
  onSelect,
}: CommentNavCardProps) {
  const { comment, code, text } = entry;
  return (
    <div
      data-nav-comment-id={comment.id}
      className={`relative border-l-2 ${current ? "border-accent bg-accent-tint" : "border-transparent"}`}
    >
      <RowButton
        className="block pl-2.5 pr-2 py-1.5"
        onClick={() => onSelect(entry)}
        aria-current={current ? "true" : undefined}
      >
        <span className="flex items-center gap-1.5 pr-5 text-[11px] text-muted">
          <Location entry={entry} />
          <span className="flex-1" />
          {comment.edited ? <span className="text-warning italic">edited</span> : null}
          <time
            dateTime={comment.createdAt}
            title={new Date(comment.createdAt).toLocaleString()}
            className="text-faint"
          >
            {relativeTime(comment.createdAt)}
          </time>
        </span>
        {code !== null ? (
          <span className="block mt-0.5 font-mono text-[11px] text-faint truncate whitespace-pre">
            {code.trim() || " "}
          </span>
        ) : null}
        <span className="mt-0.5 text-xs text-text line-clamp-4 break-words">
          {highlight(text, query)}
        </span>
      </RowButton>
      <span className="absolute top-1.5 right-2 text-muted">
        <OriginIcon source={source} url={comment.url} />
      </span>
    </div>
  );
});
