import type { ReviewComment } from "@shared/types.js";
import CommentInput from "../CommentInput";

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
    <div className="fixed bottom-4 right-4 w-96 z-50 shadow-float-lg rounded-md">
      <div className="flex items-center gap-1.5 text-[11px] text-muted px-2.5 py-1.5 bg-panel border border-hair border-b-0 rounded-t-md">
        <span className="text-text">{activeInput.filePath.split("/").pop()}</span>
        {activeInput.line !== null ? (
          <>
            <span className="text-faint">:</span>
            <span className="text-muted">L{activeInput.line}</span>
            <span className="text-faint">&middot;</span>
            <span className="text-faint">{activeInput.side}</span>
          </>
        ) : (
          <>
            <span className="text-faint">&middot;</span>
            <span className="text-faint">File comment</span>
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
