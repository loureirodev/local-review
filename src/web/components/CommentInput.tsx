import { useState, useCallback } from "react";
import type { ReviewComment } from "@shared/types.js";

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
    [handleSubmit, onCancel]
  );

  return (
    <div className="p-2 bg-neutral-900 border border-neutral-700 rounded m-1">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment... (Ctrl+Enter to submit)"
        rows={3}
        autoFocus
        className="w-full px-2 py-1.5 text-sm bg-neutral-800 border border-neutral-700 rounded resize-none focus:outline-none focus:border-blue-500 text-neutral-200 placeholder-neutral-500"
      />
      <div className="flex justify-end gap-2 mt-1.5">
        <button
          onClick={onCancel}
          className="px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!body.trim()}
          className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded transition-colors"
        >
          Comment
        </button>
      </div>
    </div>
  );
}
