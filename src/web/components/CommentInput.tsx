import type { ReviewComment } from "@shared/types.js";
import { useCallback, useState } from "react";

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
    <div className="p-2 bg-neutral-900/95 border border-neutral-800/60 rounded-b-md">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment..."
        rows={3}
        className="w-full px-2.5 py-2 text-[13px] font-mono bg-neutral-800/50 border border-neutral-800/60 rounded-md resize-none focus:outline-none focus:border-neutral-600 text-neutral-200 placeholder-neutral-600 transition-colors leading-relaxed"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-neutral-600 font-mono">
          <kbd className="px-1 py-px bg-neutral-800/60 rounded text-[10px]">Ctrl</kbd>
          {" + "}
          <kbd className="px-1 py-px bg-neutral-800/60 rounded text-[10px]">Enter</kbd>
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-0.5 text-[11px] font-mono text-neutral-400 hover:text-neutral-200 transition-colors rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!body.trim()}
            className="px-2 py-0.5 text-[11px] font-mono bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
