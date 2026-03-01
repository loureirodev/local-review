import { type ReactNode, useState } from "react";

interface LayoutProps {
  sidebar: ReactNode;
  toolbar: ReactNode;
  children: ReactNode;
}

function SidebarToggle({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-2 -right-3 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 transition-colors shadow-md"
      title={collapsed ? "Show file list" : "Hide file list"}
    >
      <svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform duration-200 ${collapsed ? "rotate-0" : "rotate-180"}`}
      >
        <path d="M4 2l4 4-4 4" />
      </svg>
    </button>
  );
}

export default function Layout({ sidebar, toolbar, children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      {toolbar}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`relative flex-shrink-0 border-r border-neutral-800/60 bg-neutral-950 overflow-hidden transition-[width] duration-200 ease-in-out ${sidebarCollapsed ? "w-0 border-r-0" : "w-72"}`}
        >
          <div className={`w-72 h-full ${sidebarCollapsed ? "invisible" : ""}`}>{sidebar}</div>
          <SidebarToggle
            collapsed={sidebarCollapsed}
            onClick={() => setSidebarCollapsed((c) => !c)}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto scroll-smooth-y bg-neutral-950">
          {sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="fixed top-11 left-1 z-20 flex items-center justify-center w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 transition-colors shadow-md"
              title="Show file list"
            >
              <svg
                aria-hidden="true"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 2l4 4-4 4" />
              </svg>
            </button>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
