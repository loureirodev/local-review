import * as Dialog from "@radix-ui/react-dialog";
import type { DiffSource, ReviewComment } from "@shared/types";
import { useCallback, useRef, useState } from "react";
import { Button, IconButton } from "./Button";
import CommentDisplay from "./CommentDisplay";
import CommentInput from "./CommentInput";
import { CloseIcon, ICON_SIZE_INLINE, PlusIcon } from "./icons";

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
              <div className="flex items-center gap-2 px-4 py-3 border-b border-hair bg-bg sticky top-0 z-10">
                <Dialog.Title className="text-[13px] text-text truncate flex-1">
                  {filePath.split("/").pop()}
                  <span className="text-faint ml-2">
                    {comments.length} comment{comments.length !== 1 ? "s" : ""}
                  </span>
                </Dialog.Title>
                <Dialog.Close asChild>
                  <IconButton compact title="Close" aria-label="Close">
                    <CloseIcon size={ICON_SIZE_INLINE} />
                  </IconButton>
                </Dialog.Close>
              </div>

              {/* Full path */}
              <div className="px-4 py-1.5 border-b border-hair">
                <span className="text-[11px] text-faint break-all">{filePath}</span>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto p-2">
                {comments.length === 0 && !inputVisible ? (
                  <div className="text-center py-8 text-faint text-[13px]">
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
              <div className="border-t border-hair bg-bg">
                <div className="p-2">
                  {inputVisible ? (
                    <CommentInput
                      filePath={filePath}
                      line={null}
                      side={null}
                      label="File comment"
                      onSubmit={handleAddComment}
                      onCancel={() => setInputVisible(false)}
                    />
                  ) : (
                    <Button onClick={() => setInputVisible(true)}>
                      <PlusIcon size={ICON_SIZE_INLINE} />
                      Add file comment
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
