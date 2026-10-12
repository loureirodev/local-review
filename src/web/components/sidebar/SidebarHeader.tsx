import type { Ref } from "react";
import { shortcutLabel } from "../../shortcuts/registry";
import { SegmentedControl } from "../Button";
import { CommentIcon, FileIcon, ICON_SIZE_INLINE, RouteIcon } from "../icons";

export type SidebarView = "files" | "comments" | "walkthrough";

const PLACEHOLDERS: Record<SidebarView, string> = {
  files: "Filter files…",
  comments: "Search comments…",
  walkthrough: "Filter steps…",
};

interface SidebarHeaderProps {
  view: SidebarView;
  onViewChange: (view: SidebarView) => void;
  /** The active view's query; each view keeps its own. */
  query: string;
  onQueryChange: (query: string) => void;
  commentCount: number;
  /** The review has a walkthrough: the switch offers its view. */
  hasWalkthrough: boolean;
  inputRef: Ref<HTMLInputElement>;
}

/** One row: the active view's search and the view switch (Walkthrough when the
 *  review has one, Files, Comments), so the switch costs the sidebar no height. */
export default function SidebarHeader({
  view,
  onViewChange,
  query,
  onQueryChange,
  commentCount,
  hasWalkthrough,
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
          className="peer w-full pl-2 pr-6 py-1 text-[13px] bg-panel border border-hair rounded-md text-text placeholder-faint transition-colors"
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
        // The walkthrough leads: it is where the review opens and reads first.
        options={[
          ...(hasWalkthrough
            ? [
                {
                  value: "walkthrough" as const,
                  title: "Walkthrough",
                  label: <RouteIcon size={ICON_SIZE_INLINE} />,
                },
              ]
            : []),
          { value: "files", title: "Files", label: <FileIcon size={ICON_SIZE_INLINE} /> },
          {
            value: "comments",
            title: `Comments (${commentCount})`,
            label: <CommentIcon size={ICON_SIZE_INLINE} written={commentCount > 0} />,
          },
        ]}
      />
    </div>
  );
}
