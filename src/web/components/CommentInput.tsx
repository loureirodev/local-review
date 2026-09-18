import type { ReviewComment } from "@shared/types.js";
import { useCallback, useState } from "react";
import { Button } from "./Button";

interface CommentInputProps {
  filePath: string;
  line: number | null;
  side: "addition" | "deletion" | null;
  onSubmit: (comment: ReviewComment) => void;
  onCancel: () => void;
}

export default function CommentInput({
  filePath,
  line,
  side,
  onSubmit,
  onCancel,
}: CommentInputProps) {
  const [body, setBody] = useState("");

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
    setBody("");
  }, [body, filePath, line, side, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape") {
        onCancel();
      }
    },
    [handleSubmit, onCancel],
  );

  return (
    <div className="p-2 bg-panel border border-hair rounded-b-md">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment..."
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
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!body.trim()}>
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
