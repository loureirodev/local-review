import * as Dialog from "@radix-ui/react-dialog";
import type { DiffSource, ReviewComment } from "@shared/types.js";
import { useCallback, useRef, useState } from "react";
import CommentDisplay from "./CommentDisplay";
import CommentInput from "./CommentInput";
import { CloseIcon } from "./icons";

interface FileCommentsDrawerProps {
  filePath: string | null;
  comments: ReviewComment[];
  source: DiffSource | null;
  /** When true, open with CommentInput visible immediately. */
  showInput: boolean;
  onClose: () => void;
  onAddComment: (comment: ReviewComment) => void;
  onDeleteComment: (filePath: string, commentId: string) => void;
  onUpdateComment: (filePath: string, commentId: string, body: string) => void;
}

export default function FileCommentsDrawer({
  filePath,
  comments,
  source,
  showInput,
  onClose,
  onAddComment,
  onDeleteComment,
  onUpdateComment,
}: FileCommentsDrawerProps) {
  const [inputVisible, setInputVisible] = useState(showInput);

  const handleAddComment = useCallback(
    (comment: ReviewComment) => {
      onAddComment(comment);
      setInputVisible(false);
    },
    [onAddComment],
  );

  // Sync inputVisible when showInput prop changes (drawer reopened with "+" click)
  const prevShowInputRef = useRef(showInput);
  if (showInput !== prevShowInputRef.current) {
    prevShowInputRef.current = showInput;
    if (showInput) setInputVisible(true);
  }

  return (
    <Dialog.Root open={filePath !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="drawer-content scroll-smooth-y" aria-describedby={undefined}>
          {filePath && (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-800/60 bg-neutral-950/80 sticky top-0 z-10">
                <Dialog.Title className="text-[13px] font-mono text-neutral-300 truncate flex-1">
                  {filePath.split("/").pop()}
                  <span className="text-neutral-600 ml-2">
                    {comments.length} comment{comments.length !== 1 ? "s" : ""}
                  </span>
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors rounded"
                    title="Close"
                  >
                    <CloseIcon className="size-4" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Full path */}
              <div className="px-4 py-1.5 border-b border-neutral-800/30">
                <span className="text-[11px] font-mono text-neutral-600 break-all">{filePath}</span>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto p-2">
                {comments.length === 0 && !inputVisible ? (
                  <div className="text-center py-8 text-neutral-600 text-[13px] font-mono">
                    No file-level comments yet
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {comments.map((comment) => (
                      <CommentDisplay
                        key={comment.id}
                        comment={comment}
                        source={source}
                        orphanedLine={comment.line !== null}
                        onDelete={(id) => onDeleteComment(comment.filePath, id)}
                        onUpdate={(id, body) => onUpdateComment(comment.filePath, id, body)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Add comment area */}
              <div className="border-t border-neutral-800/60 bg-neutral-950/60">
                {inputVisible ? (
                  <CommentInput
                    filePath={filePath}
                    line={null}
                    side={null}
                    onSubmit={handleAddComment}
                    onCancel={() => setInputVisible(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setInputVisible(true)}
                    className="w-full px-4 py-2.5 text-[12px] font-mono text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30 transition-colors text-left"
                  >
                    + Add file comment
                  </button>
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
