import { useRef, useState } from "react";
import { useMountEffect } from "../hooks/useMountEffect";
import { useNarrowScreen } from "../hooks/useNarrowScreen";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
} from "../hooks/useSettings";
import { IconButton, SegmentedControl, ToggleRow } from "./Button";
import {
  FontSizeIcon,
  ICON_SIZE_INLINE,
  LineNumbersIcon,
  LineSpacingIcon,
  MinusIcon,
  PlusIcon,
  SettingsIcon,
  SplitIcon,
  UnifiedIcon,
  WrapIcon,
} from "./icons";

interface SettingsPopoverProps {
  diffStyle: "split" | "unified";
  wrapLines: boolean;
  showLineNumbers: boolean;
  fontSize: number;
  lineHeight: number;
  onDiffStyleChange: (style: "split" | "unified") => void;
  onWrapLinesChange: (wrap: boolean) => void;
  onShowLineNumbersChange: (show: boolean) => void;
  onFontSizeChange: (size: number) => void;
  onLineHeightChange: (height: number) => void;
}

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
      <span className="text-muted">{icon}</span>
      <span className="text-text flex-1 whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1">
        <IconButton
          compact
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <MinusIcon size={ICON_SIZE_INLINE} />
        </IconButton>
        <span className="w-10 text-center text-text tabular-nums text-[11px]">
          {value}
          {unit}
        </span>
        <IconButton
          compact
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <PlusIcon size={ICON_SIZE_INLINE} />
        </IconButton>
      </div>
    </div>
  );
}

const DIFF_STYLE_OPTIONS = [
  {
    value: "split",
    label: (
      <>
        <SplitIcon size={ICON_SIZE_INLINE} />
        Split
      </>
    ),
  },
  {
    value: "unified",
    label: (
      <>
        <UnifiedIcon size={ICON_SIZE_INLINE} />
        Unified
      </>
    ),
  },
] as const;

export default function SettingsPopover({
  diffStyle,
  wrapLines,
  showLineNumbers,
  fontSize,
  lineHeight,
  onDiffStyleChange,
  onWrapLinesChange,
  onShowLineNumbersChange,
  onFontSizeChange,
  onLineHeightChange,
}: SettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  const diffStyleLocked = useNarrowScreen();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // The handlers read only refs and the stable `setOpen`, so they register once.
  useMountEffect(() => {
    // Close on outside click.
    const onMouseDown = (e: MouseEvent) => {
      if (openRef.current && !containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    // Close on Escape. Focus returns to the trigger when it was inside the
    // popover, which is about to go inert and would otherwise drop it on <body>.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !openRef.current) return;
      e.preventDefault();
      const hadFocus = containerRef.current?.contains(document.activeElement) ?? false;
      setOpen(false);
      if (hadFocus) triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  return (
    <div className="relative" ref={containerRef}>
      <IconButton
        ref={triggerRef}
        active={open}
        onClick={() => setOpen((v) => !v)}
        title="Display settings"
        aria-label="Display settings"
        aria-expanded={open}
      >
        <SettingsIcon open={open} />
      </IconButton>
      {/* Kept mounted for the fade, so `inert` takes it out of the tab order
          and the accessibility tree while closed. */}
      <div
        inert={!open}
        className={`absolute top-full right-0 mt-1.5 w-56 bg-panel border border-hair rounded-lg shadow-float-lg z-50 overflow-hidden transition-all duration-200 origin-top-right ${
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="px-2.5 py-1.5 border-b border-hair text-[11px] font-medium text-muted uppercase tracking-wider">
          Display
        </div>

        <div className="p-1.5 space-y-0.5">
          <div className="px-2.5 py-1.5">
            <div className="text-[11px] text-muted mb-1.5">Diff layout</div>
            {diffStyleLocked ? (
              <div className="text-xs text-muted">Unified on small screens</div>
            ) : (
              <SegmentedControl
                aria-label="Diff layout"
                value={diffStyle}
                options={DIFF_STYLE_OPTIONS}
                onChange={onDiffStyleChange}
              />
            )}
          </div>

          <div className="mx-2 border-t border-hair" />

          {/* Toggle options */}
          <ToggleRow
            icon={<WrapIcon size={ICON_SIZE_INLINE} />}
            label="Wrap lines"
            checked={wrapLines}
            onChange={onWrapLinesChange}
          />
          <ToggleRow
            icon={<LineNumbersIcon size={ICON_SIZE_INLINE} />}
            label="Line numbers"
            checked={showLineNumbers}
            onChange={onShowLineNumbersChange}
          />

          <div className="mx-2 border-t border-hair" />

          {/* Font size & line height */}
          <StepperRow
            icon={<FontSizeIcon size={ICON_SIZE_INLINE} />}
            label="Font size"
            value={fontSize}
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            step={1}
            unit="px"
            onChange={onFontSizeChange}
          />
          <StepperRow
            icon={<LineSpacingIcon size={ICON_SIZE_INLINE} />}
            label="Line height"
            value={lineHeight}
            min={LINE_HEIGHT_MIN}
            max={LINE_HEIGHT_MAX}
            step={2}
            unit="px"
            onChange={onLineHeightChange}
          />
        </div>
      </div>
    </div>
  );
}
