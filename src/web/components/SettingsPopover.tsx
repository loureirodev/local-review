import { useCallback, useEffect, useRef, useState } from "react";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
} from "../hooks/useSettings.js";
import {
  FontSizeIcon,
  GearIcon,
  LineNumbersIcon,
  LineSpacingIcon,
  SplitIcon,
  TreeIcon,
  UnifiedIcon,
  WrapIcon,
} from "./icons.js";

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

/* ── Main Popover ── */

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
  const openRef = useRef(open);
  openRef.current = open;

  // Close on outside click — listener registered once, openRef read at event time
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (
      openRef.current &&
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [handleOutsideClick]);

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
      {open ? (
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
                  <SplitIcon />
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
                  <UnifiedIcon />
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
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              step={1}
              unit="px"
              onChange={onFontSizeChange}
            />
            <StepperRow
              icon={<LineSpacingIcon />}
              label="Line height"
              value={lineHeight}
              min={LINE_HEIGHT_MIN}
              max={LINE_HEIGHT_MAX}
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
      ) : null}
    </div>
  );
}
