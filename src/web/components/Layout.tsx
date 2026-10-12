import type { ReactNode } from "react";

// On the aside and its content: the content keeps its width while the aside
// animates to zero, so it slides out instead of reflowing.
const SIDEBAR_WIDTH = "w-sidebar max-md:max-w-[85vw]";

interface LayoutProps {
  sidebar: ReactNode;
  toolbar: ReactNode;
  sidebarCollapsed: boolean;
  onCollapseSidebar: () => void;
  children: ReactNode;
}

export default function Layout({
  sidebar,
  toolbar,
  sidebarCollapsed,
  onCollapseSidebar,
  children,
}: LayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-bg">
      {toolbar}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Phones only: a tap beside the overlaid sidebar closes it. Out of the
            tab order: the toolbar toggle and Ctrl+B are the keyboard way. */}
        {sidebarCollapsed ? null : (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Hide file list"
            onClick={onCollapseSidebar}
            className="md:hidden absolute inset-0 z-10 bg-bg/60 cursor-default"
          />
        )}
        {/* On phones the sidebar lies over the diff instead of squeezing it. */}
        <aside
          className={`flex-shrink-0 border-r border-hair bg-bg overflow-hidden transition-[width] duration-200 ease-in-out max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-20 ${sidebarCollapsed ? "w-0 border-r-0" : SIDEBAR_WIDTH}`}
        >
          <div className={`${SIDEBAR_WIDTH} h-full ${sidebarCollapsed ? "invisible" : ""}`}>
            {sidebar}
          </div>
        </aside>

        {/* Main content: CodeView (@pierre/diffs) owns its own scroll container
            with overflow-y-auto. The cell must not scroll (overflow-hidden)
            to avoid nested scrollers. If CodeView initialization fails (CSS not
            loaded, bundle error), the diff will not be scrollable. */}
        <main className="flex-1 overflow-hidden bg-bg">{children}</main>
      </div>
    </div>
  );
}
