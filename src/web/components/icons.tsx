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

export function TreeIcon() {
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
      <path d="M3 2v12M3 5h3M3 9h3M6 9v3h3" />
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

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2.5 6l2.5 2.5 4.5-4.5" />
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

export function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
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
      className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
    >
      <path d="M4 2l4 4-4 4" />
    </svg>
  );
}

export function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={open ? "text-blue-400/80" : "text-neutral-500"}
    >
      {open ? (
        <path d="M2 4v8a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H8L6.5 3.5A1 1 0 005.8 3H3a1 1 0 00-1 1z" />
      ) : (
        <path
          d="M2 4v8a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H8L6.5 3.5A1 1 0 005.8 3H3a1 1 0 00-1 1z"
          fill="currentColor"
          fillOpacity="0.15"
        />
      )}
    </svg>
  );
}
