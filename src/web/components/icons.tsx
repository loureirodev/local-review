/* ── Shared SVG icon components ── */

export function SettingsIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Three horizontal lines */}
      <line x1="2.5" y1="4" x2="13.5" y2="4" />
      <line x1="2.5" y1="8" x2="13.5" y2="8" />
      <line x1="2.5" y1="12" x2="13.5" y2="12" />
      {/* Slider knobs — positions shift when open */}
      <circle
        cx={open ? "9.5" : "5.5"}
        cy="4"
        r="1.5"
        fill="currentColor"
        className="transition-all duration-200"
      />
      <circle
        cx={open ? "5" : "10"}
        cy="8"
        r="1.5"
        fill="currentColor"
        className="transition-all duration-200"
      />
      <circle
        cx={open ? "11" : "7"}
        cy="12"
        r="1.5"
        fill="currentColor"
        className="transition-all duration-200"
      />
    </svg>
  );
}

export function SplitIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <rect x="1.5" y="2.5" width="5" height="11" rx="1" />
      <rect x="9.5" y="2.5" width="5" height="11" rx="1" />
    </svg>
  );
}

export function UnifiedIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
      <line x1="4.5" y1="5.5" x2="11.5" y2="5.5" />
      <line x1="4.5" y1="8" x2="11.5" y2="8" />
      <line x1="4.5" y1="10.5" x2="11.5" y2="10.5" />
    </svg>
  );
}

export function WrapIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 4h10M3 8h8a2.5 2.5 0 0 1 0 5H9" />
      <polyline points="10,11 9,13 8,11" />
    </svg>
  );
}

export function LineNumbersIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <text x="2" y="5.5" fontSize="4" fill="currentColor" stroke="none" fontFamily="monospace">
        1
      </text>
      <line x1="7" y1="4" x2="14" y2="4" />
      <text x="2" y="9.5" fontSize="4" fill="currentColor" stroke="none" fontFamily="monospace">
        2
      </text>
      <line x1="7" y1="8" x2="14" y2="8" />
      <text x="2" y="13.5" fontSize="4" fill="currentColor" stroke="none" fontFamily="monospace">
        3
      </text>
      <line x1="7" y1="12" x2="14" y2="12" />
    </svg>
  );
}

export function FontSizeIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12V4h2.5a2 2 0 0 1 0 4H3M3 8h2.5" />
      <path d="M9 12V6l4 6V6" />
    </svg>
  );
}

export function LineSpacingIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="6" y1="4" x2="14" y2="4" />
      <line x1="6" y1="8" x2="14" y2="8" />
      <line x1="6" y1="12" x2="14" y2="12" />
      <path d="M3 2l-1.5 2h3zM3 14l-1.5-2h3z" fill="currentColor" stroke="none" />
      <line x1="3" y1="4" x2="3" y2="12" />
    </svg>
  );
}

export function BranchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="5" cy="4" r="2" />
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="6" r="2" />
      <path d="M5 6v4M10 6c-2 0-5 0-5 4" />
    </svg>
  );
}

export function ExportIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 13h8M8 3v7M5 6l3-3 3 3" />
    </svg>
  );
}

export function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M3 3l6 6M9 3l-6 6" />
    </svg>
  );
}

export function SidebarIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <line x1="5.5" y1="2.5" x2="5.5" y2="13.5" />
      {collapsed ? null : (
        <>
          <line x1="3" y1="5.5" x2="4.5" y2="5.5" opacity="0.5" />
          <line x1="3" y1="8" x2="4.5" y2="8" opacity="0.5" />
        </>
      )}
    </svg>
  );
}

/* ── Comment origin icons ── */

export function GitHubIcon() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function GitLabIcon() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 -1 26 26"
    >
      <path d="M12.906 24 .403 14.723a1.07 1.07 0 0 1-.351-.497l-.002-.008a.926.926 0 0 1 .002-.609l-.002.007 1.463-4.437zM5.293.354l2.874 8.823H1.512L4.335.354a.52.52 0 0 1 .49-.353h.015-.001L4.865 0c.212 0 .388.151.427.351v.003zm2.874 8.823h9.479L12.907 24zm17.595 4.436a.926.926 0 0 1-.002.609l.002-.007a1.07 1.07 0 0 1-.351.503l-.002.002L12.906 24 24.3 9.177zM21.477.354 24.3 9.177h-6.655L20.519.354a.436.436 0 0 1 .455-.353h-.001.014c.227 0 .419.146.489.349z" />
    </svg>
  );
}

export function AgentIcon() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="10" height="8" rx="2" />
      <circle cx="6" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="8" r="1" fill="currentColor" stroke="none" />
      <line x1="5" y1="2" x2="5" y2="4" />
      <line x1="11" y1="2" x2="11" y2="4" />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
      <line x1="9.5" y1="3.5" x2="12.5" y2="6.5" />
    </svg>
  );
}
