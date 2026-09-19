import type { ReactNode } from "react";

interface LayoutProps {
  sidebar: ReactNode;
  toolbar: ReactNode;
  sidebarCollapsed: boolean;
  children: ReactNode;
}

export default function Layout({ sidebar, toolbar, sidebarCollapsed, children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-bg">
      {toolbar}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`flex-shrink-0 border-r border-hair bg-bg overflow-hidden transition-[width] duration-200 ease-in-out ${sidebarCollapsed ? "w-0 border-r-0" : "w-72"}`}
        >
          <div className={`w-72 h-full ${sidebarCollapsed ? "invisible" : ""}`}>{sidebar}</div>
        </aside>

        {/* Main content — CodeView (@pierre/diffs) owns its own scroll container
            with overflow-y-auto. The cell must not scroll (overflow-hidden)
            to avoid nested scrollers. If CodeView initialization fails (CSS not
            loaded, bundle error), the diff will not be scrollable. */}
        <main className="flex-1 overflow-hidden bg-bg">{children}</main>
      </div>
    </div>
  );
}
