import type { ReviewComment } from "@shared/types.js";

interface CommentDisplayProps {
  comment: ReviewComment;
  onDelete: (commentId: string) => void;
}

export default function CommentDisplay({
  comment,
  onDelete,
}: CommentDisplayProps) {
  return (
    <div className="p-2 bg-neutral-900 border border-neutral-700 rounded m-1">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-neutral-200 whitespace-pre-wrap break-words flex-1">
          {comment.body}
        </p>
        <button
          onClick={() => onDelete(comment.id)}
          className="flex-shrink-0 p-0.5 text-neutral-500 hover:text-red-400 transition-colors"
          title="Delete comment"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-1 text-xs text-neutral-500">
        {comment.line !== null && (
          <span>
            Line {comment.line}
            {comment.side && ` (${comment.side})`}
            {" \u00b7 "}
          </span>
        )}
        {new Date(comment.createdAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
