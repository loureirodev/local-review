import type { ReviewComment } from "@shared/types.js";
import CommentInput from "../CommentInput.js";

export interface ActiveInput {
  filePath: string;
  line: number | null;
  side: "addition" | "deletion" | null;
}

interface CommentInputOverlayProps {
  activeInput: ActiveInput;
  onSubmit: (comment: ReviewComment) => void;
  onCancel: () => void;
}

export function CommentInputOverlay({ activeInput, onSubmit, onCancel }: CommentInputOverlayProps) {
  return (
    <div className="fixed bottom-4 right-4 w-96 z-50 shadow-2xl shadow-black/50">
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-500 px-2.5 py-1.5 bg-neutral-900 border border-neutral-800/60 border-b-0 rounded-t-md">
        <span className="text-neutral-400">{activeInput.filePath.split("/").pop()}</span>
        {activeInput.line !== null ? (
          <>
            <span className="text-neutral-700">:</span>
            <span className="text-neutral-500">L{activeInput.line}</span>
            <span className="text-neutral-700">&middot;</span>
            <span className="text-neutral-600">{activeInput.side}</span>
          </>
        ) : (
          <>
            <span className="text-neutral-700">&middot;</span>
            <span className="text-neutral-600">File comment</span>
          </>
        )}
      </div>
      <CommentInput
        filePath={activeInput.filePath}
        line={activeInput.line}
        side={activeInput.side}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </div>
  );
}
