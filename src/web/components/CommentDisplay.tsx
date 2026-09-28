import type { DiffSource, ReviewComment } from "@shared/types.js";
import { memo, useCallback, useState } from "react";
import { IconButton } from "./Button";
import { CommentCard, CommentFormFooter } from "./CommentCard";
import {
  AgentIcon,
  CloseIcon,
  GitHubIcon,
  GitLabIcon,
  ICON_SIZE_INLINE,
  PencilIcon,
  UserIcon,
} from "./icons";
import { Markdown } from "./markdown/Markdown";
import { MarkdownEditor, preloadMarkdownEditor } from "./markdown/MarkdownEditor";

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
    case "branch":
    case "pending":
    case "folder":
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
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
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

  // Reading and editing share one box: the toolbar replaces the edit button
  // and only the save row is added.
  return (
    <CommentCard
      className="mx-1 my-1"
      writing={editing}
      header={
        <>
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
          {comment.edited ? (
            <span className="text-[10px] text-warning italic">(edited)</span>
          ) : null}

          <div className="ml-auto flex items-center gap-0.5">
            {editing ? (
              <div ref={setToolbar} className="contents" />
            ) : (
              <IconButton
                compact
                onClick={() => {
                  setEditBody(comment.body);
                  setEditing(true);
                }}
                onPointerEnter={preloadMarkdownEditor}
                onFocus={preloadMarkdownEditor}
                title="Edit comment"
                aria-label="Edit comment"
              >
                <PencilIcon size={ICON_SIZE_INLINE} />
              </IconButton>
            )}
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
        </>
      }
      footer={
        editing ? (
          <CommentFormFooter
            submitLabel="Save"
            canSubmit={canSave}
            onSubmit={handleSave}
            onCancel={handleCancel}
          />
        ) : null
      }
    >
      {editing ? (
        <MarkdownEditor
          value={editBody}
          onChange={setEditBody}
          onSubmit={handleSave}
          onCancel={handleCancel}
          toolbarContainer={toolbar}
          autoFocus
          fallback={<Markdown>{comment.body}</Markdown>}
        />
      ) : (
        <Markdown>{comment.body}</Markdown>
      )}
    </CommentCard>
  );
});

export default CommentDisplay;
