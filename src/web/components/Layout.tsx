import { type ReactNode } from "react";

interface LayoutProps {
  sidebar: ReactNode;
  toolbar: ReactNode;
  children: ReactNode;
}

export default function Layout({ sidebar, toolbar, children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen">
      {toolbar}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 border-r border-neutral-800 bg-neutral-950 overflow-hidden">
          {sidebar}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-neutral-950">{children}</main>
      </div>
    </div>
  );
}
