import type { ReactNode } from "react";
import { IS_MAC } from "../utils/platform";
import { Button } from "./Button";

/** The box a comment is read, edited and written in, so its layout never shifts
 *  between them. A footer appears only while writing. */
export function CommentCard({
  className = "",
  writing,
  header,
  footer,
  children,
}: {
  className?: string;
  /** Accents the border while the editor inside has focus. */
  writing: boolean;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={`bg-panel border border-hair rounded-md overflow-hidden transition-colors ${
        writing ? "focus-within:border-accent" : ""
      } ${className}`}
    >
      <div className="flex items-center gap-2 px-2.5 py-1 border-b border-hair">{header}</div>
      <div className="px-2.5 py-1.5">{children}</div>
      {footer}
    </div>
  );
}

/** The shortcut hint and actions under a comment being written or edited. */
export function CommentFormFooter({
  submitLabel,
  canSubmit,
  onSubmit,
  onCancel,
}: {
  submitLabel: string;
  canSubmit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-2.5 pb-1.5">
      <span className="text-[11px] text-faint">
        <kbd className="px-1 py-px bg-track rounded text-[10px]">{IS_MAC ? "⌘" : "Ctrl"}</kbd>
        {" + "}
        <kbd className="px-1 py-px bg-track rounded text-[10px]">Enter</kbd>
      </span>
      <div className="flex gap-1.5">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onSubmit} disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
