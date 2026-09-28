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
      <CommentInput
        filePath={activeInput.filePath}
        line={activeInput.line}
        side={activeInput.side}
        label={
          <>
            <span className="text-text truncate">{activeInput.filePath.split("/").pop()}</span>
            {activeInput.line !== null ? (
              <>
                <span className="text-faint">:</span>
                <span className="text-muted">L{activeInput.line}</span>
                {activeInput.side ? (
                  <>
                    <span className="text-faint">&middot;</span>
                    <span className="text-faint">{activeInput.side}</span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <span className="text-faint">&middot;</span>
                <span className="text-faint">File comment</span>
              </>
            )}
          </>
        }
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </div>
  );
}
