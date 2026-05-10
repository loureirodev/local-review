// Inline styles are required: these render inside FileDiff's shadow DOM via
// renderHeaderPrefix / renderHeaderMetadata, where Tailwind utility classes
// don't apply.

export function HeaderChevron({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? "Expand file" : "Collapse file"}
      aria-label={collapsed ? "Expand file" : "Collapse file"}
      aria-pressed={collapsed}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "20px",
        height: "20px",
        marginLeft: "-4px",
        marginRight: "2px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "#737373",
        borderRadius: "4px",
        flexShrink: 0,
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{
          transition: "transform 150ms",
          transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
        }}
      >
        <path d="M4 2l4 4-4 4" />
      </svg>
    </button>
  );
}

export function ViewedToggle({ viewed, onClick }: { viewed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={viewed}
      title={viewed ? "Mark as not viewed" : "Mark as viewed"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "1px 8px 1px 6px",
        fontSize: "11px",
        fontFamily: "monospace",
        background: viewed ? "rgba(34, 197, 94, 0.15)" : "rgba(64, 64, 64, 0.4)",
        border: `1px solid ${viewed ? "rgba(34, 197, 94, 0.4)" : "rgba(82, 82, 82, 0.4)"}`,
        borderRadius: "4px",
        color: viewed ? "#86efac" : "#737373",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "12px",
          height: "12px",
          borderRadius: "999px",
          background: viewed ? "rgba(34, 197, 94, 0.25)" : "transparent",
          border: viewed ? "none" : "1px solid currentColor",
        }}
      >
        {viewed ? (
          <svg
            width="9"
            height="9"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2.5 6l2.5 2.5 4.5-4.5" />
          </svg>
        ) : null}
      </span>
      Viewed
    </button>
  );
}

export function FileCommentBadge({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "1px 6px",
        fontSize: "11px",
        fontFamily: "monospace",
        background: count > 0 ? "rgba(64, 64, 64, 0.6)" : "rgba(64, 64, 64, 0.4)",
        border: `1px solid ${count > 0 ? "rgba(82, 82, 82, 0.5)" : "rgba(82, 82, 82, 0.4)"}`,
        borderRadius: "4px",
        color: count > 0 ? "#a3a3a3" : "#737373",
        cursor: "pointer",
      }}
      title={
        count > 0 ? `${count} file-level comment${count !== 1 ? "s" : ""}` : "Add file comment"
      }
    >
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
        <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5l-3 3V3z" />
      </svg>
      {count > 0 ? count : "+"}
    </button>
  );
}
