import type { ReviewComment } from "@shared/types.js";
import { memo } from "react";
import { CloseIcon } from "./icons.js";

interface CommentDisplayProps {
  comment: ReviewComment;
  onDelete: (commentId: string) => void;
}

const CommentDisplay = memo(function CommentDisplay({ comment, onDelete }: CommentDisplayProps) {
  return (
    <div className="mx-1 my-1 bg-neutral-900/80 border border-neutral-800/60 rounded-md overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-2.5 py-1 border-b border-neutral-800/40 bg-neutral-900/50">
        <span className="text-[11px] font-mono text-neutral-500">
          {comment.line !== null ? (
            <>
              L{comment.line}
              {comment.side ? <span className="text-neutral-600"> {comment.side}</span> : null}
            </>
          ) : (
            "file"
          )}
        </span>
        <span className="text-neutral-700">&middot;</span>
        <span className="text-[11px] font-mono text-neutral-600">
          {new Date(comment.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        <button
          type="button"
          onClick={() => onDelete(comment.id)}
          className="ml-auto flex-shrink-0 p-0.5 text-neutral-600 hover:text-red-400/80 transition-colors rounded"
          title="Delete comment"
        >
          <CloseIcon className="w-3 h-3" />
        </button>
      </div>

      {/* Body */}
      <div className="px-2.5 py-1.5">
        <p className="text-[13px] text-neutral-300 whitespace-pre-wrap break-words leading-relaxed">
          {comment.body}
        </p>
      </div>
    </div>
  );
});

export default CommentDisplay;
