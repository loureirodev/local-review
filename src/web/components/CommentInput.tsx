import type { ReviewComment } from "@shared/types.js";
import { type ReactNode, useCallback, useState } from "react";
import { CommentCard, CommentFormFooter } from "./CommentCard";
import { MarkdownEditor } from "./markdown/MarkdownEditor";

/** Lines the empty editor reserves for a new comment. */
const NEW_COMMENT_LINES = 4;

interface CommentInputProps {
  filePath: string;
  line: number | null;
  side: "addition" | "deletion" | null;
  /** What the comment is attached to, on the left of the header row. */
  label: ReactNode;
  onSubmit: (comment: ReviewComment) => void;
  onCancel: () => void;
}

/** A new comment, with the formatting toolbar in its header. */
export default function CommentInput({
  filePath,
  line,
  side,
  label,
  onSubmit,
  onCancel,
}: CommentInputProps) {
  const [body, setBody] = useState("");
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);

  const handleSubmit = useCallback(() => {
    if (!body.trim()) return;
    const comment: ReviewComment = {
      id: crypto.randomUUID(),
      filePath,
      line,
      side,
      body: body.trim(),
      createdAt: new Date().toISOString(),
    };
    onSubmit(comment);
  }, [body, filePath, line, side, onSubmit]);

  return (
    <CommentCard
      writing
      header={
        <>
          <span className="flex items-center gap-1.5 min-w-0 text-[11px] text-muted">{label}</span>
          <div ref={setToolbar} className="ml-auto flex items-center gap-0.5 min-h-6" />
        </>
      }
      footer={
        <CommentFormFooter
          submitLabel="Comment"
          canSubmit={body.trim().length > 0}
          onSubmit={handleSubmit}
          onCancel={onCancel}
        />
      }
    >
      <MarkdownEditor
        value={body}
        onChange={setBody}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        toolbarContainer={toolbar}
        minLines={NEW_COMMENT_LINES}
        autoFocus
      />
    </CommentCard>
  );
}
