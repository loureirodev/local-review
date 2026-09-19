// Handed to CodeView as slotted content, so these render in the light DOM and
// keep the document's stylesheets: the shared button classes apply here.

import { Button, IconButton } from "../Button";
import { CheckIcon, ChevronRightIcon, CommentIcon, ICON_SIZE_INLINE, PlusIcon } from "../icons";

/** Smaller than `ICON_SIZE_INLINE`: this check is set inside a 12px ring. */
const CHECK_GLYPH_SIZE = 11;

export function HeaderChevron({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <IconButton
      compact
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={collapsed ? "Expand file" : "Collapse file"}
      aria-label={collapsed ? "Expand file" : "Collapse file"}
      aria-pressed={collapsed}
      style={{ marginLeft: "-4px", marginRight: "2px" }}
    >
      <ChevronRightIcon
        size={ICON_SIZE_INLINE}
        className={`transition-transform ${collapsed ? "rotate-0" : "rotate-90"}`}
      />
    </IconButton>
  );
}

export function ViewedToggle({ viewed, onClick }: { viewed: boolean; onClick: () => void }) {
  return (
    <Button
      variant={viewed ? "success" : "neutral"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={viewed}
      title={viewed ? "Mark as not viewed" : "Mark as viewed"}
    >
      {/* The ring fills and the check grows in, so the state change reads as a
          motion rather than a flicker. */}
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center size-3 shrink-0 rounded-full border transition-[background-color,border-color] duration-300 ${
          viewed ? "border-transparent bg-success/28" : "border-current"
        }`}
      >
        <CheckIcon
          size={CHECK_GLYPH_SIZE}
          className={`transition-[transform,opacity] duration-300 ease-out ${
            viewed ? "scale-100 opacity-100" : "scale-0 opacity-0"
          }`}
        />
      </span>
      Viewed
    </Button>
  );
}

export function FileCommentBadge({ count, onClick }: { count: number; onClick: () => void }) {
  const label =
    count > 0 ? `${count} file-level comment${count !== 1 ? "s" : ""}` : "Add file comment";

  // With no comments this is a bare add action (a filled icon button, findable
  // without hovering); with a count it becomes a labelled, accented button.
  if (count === 0) {
    return (
      <IconButton
        compact
        filled
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        title={label}
        aria-label={label}
      >
        <PlusIcon size={ICON_SIZE_INLINE} />
      </IconButton>
    );
  }

  return (
    <Button
      variant="primary"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
      aria-label={label}
    >
      <CommentIcon size={ICON_SIZE_INLINE} />
      {count}
    </Button>
  );
}
