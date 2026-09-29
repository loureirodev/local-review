/* Every button in the app is one of the shapes in this file, so padding, radius
   and hover stay identical across call sites. A raw `<button>` outside this file
   is a bug. See DESIGN.md. */

import type { ButtonHTMLAttributes, ReactNode } from "react";

type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

/** `neutral` is the default. `primary` is reserved for the one action a surface
 *  exists to perform; `success` is the on-state of a completion toggle. */
export type ButtonVariant = "neutral" | "primary" | "success";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-track";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  neutral: "bg-track hover:bg-hair text-text",
  primary: "bg-accent text-accent-fg hover:brightness-110 disabled:hover:bg-accent",
  success: "bg-success/18 text-success hover:bg-success/28",
};

export function Button({
  variant = "neutral",
  children,
  ...props
}: NativeButtonProps & { variant?: ButtonVariant; children: ReactNode }) {
  return (
    <button type="button" className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]}`} {...props}>
      {children}
    </button>
  );
}

/** A button whose whole content is one icon. `active` reads as held down, for a
 *  trigger whose surface is open; `compact` sits inside a row of text; `filled`
 *  is findable without hovering; `tone="danger"` is the only colour an icon
 *  button may take on. */
export function IconButton({
  active = false,
  compact = false,
  filled = false,
  tone = "neutral",
  children,
  ...props
}: NativeButtonProps & {
  active?: boolean;
  compact?: boolean;
  filled?: boolean;
  tone?: "neutral" | "danger";
  children: ReactNode;
}) {
  const size = compact ? "size-6" : "size-8";
  const hoverText = tone === "danger" ? "hover:text-danger" : "hover:text-text";
  const state = active
    ? "bg-track text-text"
    : filled
      ? `bg-track text-text hover:bg-hair ${tone === "danger" ? "hover:text-danger" : ""}`
      : `text-muted ${hoverText} hover:bg-track`;
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center ${size} rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted ${state}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** A row of mutually exclusive options (diff mode, diff layout). The selected
 *  one lifts to the page ground inside a `bg-track` well. An option whose label
 *  is only an icon takes a `title`, which is also its accessible name. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: ReactNode; title?: string }>;
  onChange: (value: T) => void;
  "aria-label": string;
}) {
  return (
    <fieldset
      className="flex items-center gap-px p-0.5 bg-track rounded-md border-0 m-0 min-w-0"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          title={option.title}
          aria-label={option.title}
          className={`flex items-center justify-center gap-1.5 flex-1 px-2.5 py-1 text-xs font-medium rounded-[5px] transition-colors ${
            option.value === value ? "bg-bg text-text" : "text-muted hover:text-text"
          }`}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

/** Text-only, for a button set inside a line of metadata ("Collapse all"): it
 *  takes no shape because its row already has one. */
export function LinkButton({ children, ...props }: NativeButtonProps & { children: ReactNode }) {
  return (
    <button
      type="button"
      className="text-muted hover:text-text transition-colors disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}

/** A settings row that is itself the button, so the switch never has to be
 *  aimed at. */
export function ToggleRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded-md hover:bg-track transition-colors group"
    >
      <span className="text-muted group-hover:text-text transition-colors">{icon}</span>
      <span className="text-text flex-1 text-left">{label}</span>
      <span className="toggle-switch" data-checked={String(checked)} aria-hidden="true" />
    </button>
  );
}

/** A list row that is itself the button — a comment in the navigator, a file
 *  group's header. Takes its display, padding and border from the call site;
 *  the shape (full width, left-aligned, `hover:bg-track`) is fixed here. */
export function RowButton({
  className = "",
  children,
  ...props
}: NativeButtonProps & { className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`w-full text-left transition-colors hover:bg-track focus-visible:outline-none focus-visible:bg-track ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
