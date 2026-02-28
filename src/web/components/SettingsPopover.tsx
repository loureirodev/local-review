import { useCallback, useEffect, useRef, useState } from "react";

interface SettingsPopoverProps {
  diffStyle: "split" | "unified";
  wrapLines: boolean;
  showLineNumbers: boolean;
  nestedTree: boolean;
  fontSize: number;
  lineHeight: number;
  onDiffStyleChange: (style: "split" | "unified") => void;
  onWrapLinesChange: (wrap: boolean) => void;
  onShowLineNumbersChange: (show: boolean) => void;
  onNestedTreeChange: (nested: boolean) => void;
  onFontSizeChange: (size: number) => void;
  onLineHeightChange: (height: number) => void;
}

/* ── Inline SVG Icons ── */

function GearIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 1.5h3l.4 1.8.6.3 1.7-.7 2.1 2.1-.7 1.7.3.6 1.8.4v3l-1.8.4-.3.6.7 1.7-2.1 2.1-1.7-.7-.6.3-.4 1.8h-3l-.4-1.8-.6-.3-1.7.7-2.1-2.1.7-1.7-.3-.6-1.8-.4v-3l1.8-.4.3-.6-.7-1.7 2.1-2.1 1.7.7.6-.3z" />
      <circle cx="8" cy="8" r="2.5" />
    </svg>
  );
}

function SplitIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke={active ? "currentColor" : "currentColor"}
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <rect x="1.5" y="2.5" width="5" height="11" rx="1" />
      <rect x="9.5" y="2.5" width="5" height="11" rx="1" />
    </svg>
  );
}

function UnifiedIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke={active ? "currentColor" : "currentColor"}
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

function WrapIcon() {
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

function LineNumbersIcon() {
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

function TreeIcon() {
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

/* ── Toggle Row ── */

function ToggleRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded hover:bg-neutral-800/70 transition-colors group"
    >
      <span className="text-neutral-400 group-hover:text-neutral-300 transition-colors">
        {icon}
      </span>
      <span className="text-neutral-300 flex-1 text-left">{label}</span>
      <span className="toggle-switch" data-checked={String(checked)} aria-hidden="true" />
    </button>
  );
}

/* ── Main Popover ── */

/* ── Stepper Row ── */

function StepperRow({
  icon,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs group">
      <span className="text-neutral-400">{icon}</span>
      <span className="text-neutral-300 flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          className="w-5 h-5 flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-neutral-300 transition-colors"
        >
          −
        </button>
        <span className="w-10 text-center text-neutral-300 font-mono tabular-nums text-[11px]">
          {value}
          {unit}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          className="w-5 h-5 flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-neutral-300 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function FontSizeIcon() {
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

function LineSpacingIcon() {
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

export default function SettingsPopover({
  diffStyle,
  wrapLines,
  showLineNumbers,
  nestedTree,
  fontSize,
  lineHeight,
  onDiffStyleChange,
  onWrapLinesChange,
  onShowLineNumbersChange,
  onNestedTreeChange,
  onFontSizeChange,
  onLineHeightChange,
}: SettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }
  }, [open, handleOutsideClick]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`p-1.5 rounded transition-colors ${
          open
            ? "bg-neutral-700 text-neutral-200"
            : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
        }`}
        title="Display settings"
        aria-label="Display settings"
      >
        <GearIcon />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-56 bg-neutral-900 border border-neutral-700/80 rounded-lg shadow-2xl shadow-black/40 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-2.5 py-1.5 border-b border-neutral-800 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
            Display
          </div>

          <div className="p-1.5 space-y-0.5">
            {/* Diff style — segmented control */}
            <div className="px-2.5 py-1.5">
              <div className="text-[11px] text-neutral-500 mb-1.5">Diff layout</div>
              <div className="flex gap-1 p-0.5 bg-neutral-800 rounded">
                <button
                  type="button"
                  onClick={() => onDiffStyleChange("split")}
                  className={`flex items-center justify-center gap-1.5 flex-1 px-2 py-1 text-xs rounded transition-all duration-150 ${
                    diffStyle === "split"
                      ? "bg-neutral-700 text-neutral-100 shadow-sm"
                      : "text-neutral-400 hover:text-neutral-300"
                  }`}
                >
                  <SplitIcon active={diffStyle === "split"} />
                  Split
                </button>
                <button
                  type="button"
                  onClick={() => onDiffStyleChange("unified")}
                  className={`flex items-center justify-center gap-1.5 flex-1 px-2 py-1 text-xs rounded transition-all duration-150 ${
                    diffStyle === "unified"
                      ? "bg-neutral-700 text-neutral-100 shadow-sm"
                      : "text-neutral-400 hover:text-neutral-300"
                  }`}
                >
                  <UnifiedIcon active={diffStyle === "unified"} />
                  Unified
                </button>
              </div>
            </div>

            <div className="mx-2 border-t border-neutral-800" />

            {/* Toggle options */}
            <ToggleRow
              icon={<WrapIcon />}
              label="Wrap lines"
              checked={wrapLines}
              onChange={onWrapLinesChange}
            />
            <ToggleRow
              icon={<LineNumbersIcon />}
              label="Line numbers"
              checked={showLineNumbers}
              onChange={onShowLineNumbersChange}
            />

            <div className="mx-2 border-t border-neutral-800" />

            {/* Font size & line height */}
            <StepperRow
              icon={<FontSizeIcon />}
              label="Font size"
              value={fontSize}
              min={10}
              max={20}
              step={1}
              unit="px"
              onChange={onFontSizeChange}
            />
            <StepperRow
              icon={<LineSpacingIcon />}
              label="Line height"
              value={lineHeight}
              min={14}
              max={32}
              step={2}
              unit="px"
              onChange={onLineHeightChange}
            />

            <div className="mx-2 border-t border-neutral-800" />

            <ToggleRow
              icon={<TreeIcon />}
              label="Nested files"
              checked={nestedTree}
              onChange={onNestedTreeChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
