import type { Ref } from "react";
import { shortcutLabel } from "../../shortcuts/registry";
import { SegmentedControl } from "../Button";
import { CommentIcon, FileIcon, ICON_SIZE_INLINE } from "../icons";

export type SidebarView = "files" | "comments";

const PLACEHOLDERS: Record<SidebarView, string> = {
  files: "Filter files…",
  comments: "Search comments…",
};

interface SidebarHeaderProps {
  view: SidebarView;
  onViewChange: (view: SidebarView) => void;
  /** The active view's query; each view keeps its own. */
  query: string;
  onQueryChange: (query: string) => void;
  commentCount: number;
  inputRef: Ref<HTMLInputElement>;
}

/** One row: the active view's search and the Files/Comments switch, so adding
 *  the switch costs the sidebar no height. */
export default function SidebarHeader({
  view,
  onViewChange,
  query,
  onQueryChange,
  commentCount,
  inputRef,
}: SidebarHeaderProps) {
  return (
    <div className="flex items-center gap-1.5 p-2 border-b border-hair">
      <div className="relative flex-1 min-w-0">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={PLACEHOLDERS[view]}
          aria-label={PLACEHOLDERS[view]}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.preventDefault();
            onQueryChange("");
            e.currentTarget.blur();
          }}
          className="peer w-full pl-2 pr-6 py-1 text-[13px] bg-panel border border-hair rounded-md focus:outline-none focus:border-accent text-text placeholder-faint transition-colors"
        />
        {/* Hidden while typing: it would sit on the text. */}
        {query ? null : (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex pointer-events-none peer-focus:hidden"
          >
            <kbd className="key-cap">{shortcutLabel("focusSearch")}</kbd>
          </span>
        )}
      </div>
      <SegmentedControl
        aria-label="Sidebar view"
        value={view}
        onChange={onViewChange}
        options={[
          { value: "files", title: "Files", label: <FileIcon size={ICON_SIZE_INLINE} /> },
          {
            value: "comments",
            title: `Comments (${commentCount})`,
            label: (
              <>
                <CommentIcon size={ICON_SIZE_INLINE} />
                <span className="tabular-nums">{commentCount}</span>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
