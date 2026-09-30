import { FOLDER_FILE_MAX_MB, type FolderTreeResponse } from "@shared/types";
import { useCollapse } from "../../context/CollapseContext";
import { shortcutLabel } from "../../shortcuts/registry";
import { IconButton, LinkButton } from "../Button";
import { HelpIcon, ICON_SIZE_INLINE } from "../icons";

interface SidebarFooterProps {
  /** Folder mode: files left out of the listing. */
  skipped?: FolderTreeResponse["skipped"];
  onOpenHelp: () => void;
}

/** Under both sidebar views: the file count, the viewer's collapse actions and
 *  the shortcuts help. */
export default function SidebarFooter({ skipped, onOpenHelp }: SidebarFooterProps) {
  const { totalFiles, setAllCollapsed } = useCollapse();
  const skippedCount = (skipped?.binary ?? 0) + (skipped?.oversized ?? 0);
  const skippedTitle = skipped
    ? `Not listed: ${skipped.binary} binary, ${skipped.oversized} over ${FOLDER_FILE_MAX_MB} MB`
    : undefined;
  const helpLabel = `Keyboard shortcuts (${shortcutLabel("help")})`;
  return (
    <div className="flex items-center gap-2 pl-2 pr-1 py-0.5 border-t border-hair bg-panel text-[11px] text-muted">
      <span className="flex-1 truncate" title={skippedTitle}>
        {totalFiles} file{totalFiles !== 1 ? "s" : ""}
        {skippedCount > 0 && ` · ${skippedCount} skipped`}
      </span>
      {totalFiles > 0 ? (
        <>
          <LinkButton onClick={() => setAllCollapsed(true)} title="Collapse all files">
            Collapse all
          </LinkButton>
          <span className="text-faint">·</span>
          <LinkButton onClick={() => setAllCollapsed(false)} title="Expand all files">
            Expand all
          </LinkButton>
        </>
      ) : null}
      <IconButton compact onClick={onOpenHelp} title={helpLabel} aria-label={helpLabel}>
        <HelpIcon size={ICON_SIZE_INLINE} />
      </IconButton>
    </div>
  );
}
