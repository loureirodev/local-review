import type { DiffSource, ReviewComment } from "@shared/types.js";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button, IconButton } from "./Button";
import {
  AgentIcon,
  CloseIcon,
  GitHubIcon,
  GitLabIcon,
  ICON_SIZE_INLINE,
  PencilIcon,
  UserIcon,
} from "./icons";

function OriginIcon({ source, url }: { source: DiffSource | null; url?: string }) {
  if (!source) return null;

  let icon: React.ReactNode;
  let tooltip: string | undefined;

  switch (source.type) {
    case "github-pr":
      icon = <GitHubIcon size={ICON_SIZE_INLINE} />;
      tooltip = url ? "Open original comment on GitHub" : "GitHub comment";
      break;
    case "gitlab-mr":
      icon = <GitLabIcon size={ICON_SIZE_INLINE} />;
      tooltip = url ? "Open original comment on GitLab" : "GitLab comment";
      break;
    case "agent":
      icon = <AgentIcon size={ICON_SIZE_INLINE} />;
      tooltip = "AI agent review";
      break;
    case "local":
      icon = <UserIcon size={ICON_SIZE_INLINE} />;
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
        className="text-muted hover:text-text transition-colors"
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
    <div className="mx-1 my-1 bg-panel border border-hair rounded-md overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-2.5 py-1 border-b border-hair">
        <span className="text-muted flex-shrink-0">
          <OriginIcon source={source} url={comment.url} />
        </span>
        <span className="text-[11px] text-muted">
          {comment.line !== null ? (
            <>
              L{comment.line}
              {comment.side ? <span className="text-faint"> {comment.side}</span> : null}
              {orphanedLine ? (
                <span className="text-faint italic"> (not in current diff)</span>
              ) : null}
            </>
          ) : (
            "file"
          )}
        </span>
        <span className="text-faint">&middot;</span>
        <span className="text-[11px] text-faint">
          {new Date(comment.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {comment.edited ? <span className="text-[10px] text-warning italic">(edited)</span> : null}

        <div className="ml-auto flex items-center gap-0.5">
          {!editing ? (
            <IconButton
              compact
              onClick={() => {
                setEditBody(comment.body);
                setEditing(true);
              }}
              title="Edit comment"
              aria-label="Edit comment"
            >
              <PencilIcon size={ICON_SIZE_INLINE} />
            </IconButton>
          ) : null}
          <IconButton
            compact
            tone="danger"
            onClick={() => onDelete(comment.id)}
            title="Delete comment"
            aria-label="Delete comment"
          >
            <CloseIcon size={ICON_SIZE_INLINE} />
          </IconButton>
        </div>
      </div>

      {/* Body */}
      <div className="px-2.5 py-1.5">
        {editing ? (
          <div>
            <textarea
              ref={textareaRef}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="w-full px-2.5 py-2 text-[13px] bg-bg border border-hair rounded-md resize-none focus:outline-none focus:border-accent text-text placeholder-faint transition-colors leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-faint">
                <kbd className="px-1 py-px bg-track rounded text-[10px]">Ctrl</kbd>
                {" + "}
                <kbd className="px-1 py-px bg-track rounded text-[10px]">Enter</kbd>
              </span>
              <div className="flex gap-1.5">
                <Button onClick={handleCancel}>Cancel</Button>
                <Button variant="primary" onClick={handleSave} disabled={!canSave}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-text whitespace-pre-wrap break-words leading-relaxed">
            {comment.body}
          </p>
        )}
      </div>
    </div>
  );
});

export default CommentDisplay;
