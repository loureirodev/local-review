import type { DiffSource, ReviewComment } from "@shared/types.js";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AgentIcon, CloseIcon, GitHubIcon, GitLabIcon, PencilIcon, UserIcon } from "./icons";

function OriginIcon({ source, url }: { source: DiffSource | null; url?: string }) {
  if (!source) return null;

  let icon: React.ReactNode;
  let tooltip: string | undefined;

  switch (source.type) {
    case "github-pr":
      icon = <GitHubIcon />;
      tooltip = url ? "Open original comment on GitHub" : "GitHub comment";
      break;
    case "gitlab-mr":
      icon = <GitLabIcon />;
      tooltip = url ? "Open original comment on GitLab" : "GitLab comment";
      break;
    case "agent":
      icon = <AgentIcon />;
      tooltip = "AI agent review";
      break;
    case "local":
      icon = <UserIcon />;
      tooltip = "Local comment";
      break;
    default:
      return null;
  }

  if (url && (source.type === "github-pr" || source.type === "gitlab-mr")) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltip}
        className="text-neutral-500 hover:text-neutral-300 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {icon}
      </a>
    );
  }

  return <span title={tooltip}>{icon}</span>;
}

interface CommentDisplayProps {
  comment: ReviewComment;
  source: DiffSource | null;
  /** When true, this is an orphaned line comment shown in the file-level panel. */
  orphanedLine?: boolean;
  onDelete: (commentId: string) => void;
  onUpdate: (commentId: string, body: string) => void;
}

const CommentDisplay = memo(function CommentDisplay({
  comment,
  source,
  orphanedLine,
  onDelete,
  onUpdate,
}: CommentDisplayProps) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
    }
  }, [editing]);

  // Sync editBody if comment.body changes externally (e.g. after save) while not editing
  useEffect(() => {
    if (!editing) {
      setEditBody(comment.body);
    }
  }, [comment.body, editing]);

  const canSave = editBody.trim().length > 0 && editBody !== comment.body;

  const handleSave = useCallback(() => {
    if (!editBody.trim() || editBody === comment.body) return;
    onUpdate(comment.id, editBody);
    setEditing(false);
  }, [onUpdate, comment.id, comment.body, editBody]);

  const handleCancel = useCallback(() => {
    setEditBody(comment.body);
    setEditing(false);
  }, [comment.body]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  return (
    <div className="mx-1 my-1 bg-neutral-900/80 border border-neutral-800/60 rounded-md overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-2.5 py-1 border-b border-neutral-800/40 bg-neutral-900/50">
        <span className="text-neutral-500 flex-shrink-0">
          <OriginIcon source={source} url={comment.url} />
        </span>
        <span className="text-[11px] font-mono text-neutral-500">
          {comment.line !== null ? (
            <>
              L{comment.line}
              {comment.side ? <span className="text-neutral-600"> {comment.side}</span> : null}
              {orphanedLine ? (
                <span className="text-neutral-600 italic"> — not in current diff</span>
              ) : null}
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
        {comment.edited ? (
          <span className="text-[10px] font-mono text-amber-500/70 italic">(edited)</span>
        ) : null}

        <div className="ml-auto flex items-center gap-0.5">
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setEditBody(comment.body);
                setEditing(true);
              }}
              className="flex-shrink-0 p-0.5 text-neutral-600 hover:text-neutral-300 transition-colors rounded"
              title="Edit comment"
            >
              <PencilIcon />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(comment.id)}
            className="flex-shrink-0 p-0.5 text-neutral-600 hover:text-red-400/80 transition-colors rounded"
            title="Delete comment"
          >
            <CloseIcon className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-2.5 py-1.5">
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              ref={textareaRef}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="w-full bg-neutral-800/80 text-[13px] text-neutral-200 font-mono rounded border border-neutral-700/50 px-2 py-1.5 resize-y focus:outline-none focus:border-neutral-600 placeholder-neutral-600"
            />
            <div className="flex items-center justify-end gap-2">
              <span className="text-[11px] text-neutral-600 font-mono mr-auto">
                <kbd className="px-1 py-px bg-neutral-800/60 rounded text-[10px]">Ctrl</kbd>
                {" + "}
                <kbd className="px-1 py-px bg-neutral-800/60 rounded text-[10px]">Enter</kbd>
                {" to save · "}
                <kbd className="px-1 py-px bg-neutral-800/60 rounded text-[10px]">Esc</kbd>
                {" to cancel"}
              </span>
              <button
                type="button"
                onClick={handleCancel}
                className="px-2 py-0.5 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="px-2 py-0.5 text-[11px] bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-neutral-300 whitespace-pre-wrap break-words leading-relaxed">
            {comment.body}
          </p>
        )}
      </div>
    </div>
  );
});

export default CommentDisplay;
