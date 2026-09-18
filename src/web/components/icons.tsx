/* Drawing rules, shared with `openspec-ui` (see DESIGN.md):
   - 24x24 grid, `strokeWidth` 1.5, rounded caps and joins
   - `currentColor` only: an icon never carries a colour of its own
   - `aria-hidden`, because the control around it carries the label
   - one render size, so an icon can be copied between the two apps verbatim */

import type { ReactNode } from "react";

/** 24x24 at 20px is an effective 1.25px stroke, matching `openspec-ui`. */
export const ICON_SIZE = 20;

/** For icons set inside 11px metadata lines, where 20px would tower over the
 *  text it labels. Same grid and stroke, smaller render. See DESIGN.md. */
export const ICON_SIZE_INLINE = 14;

interface IconProps {
  size?: number;
  className?: string;
}

function Icon({ size = ICON_SIZE, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function SettingsIcon({ open, size }: { open: boolean } & IconProps) {
  return (
    <Icon size={size}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      {/* Slider knobs; they slide when the popover opens. */}
      <circle
        cx={open ? "14" : "8"}
        cy="6"
        r="2"
        fill="currentColor"
        className="transition-all duration-200"
      />
      <circle
        cx={open ? "7.5" : "15"}
        cy="12"
        r="2"
        fill="currentColor"
        className="transition-all duration-200"
      />
      <circle
        cx={open ? "16.5" : "10.5"}
        cy="18"
        r="2"
        fill="currentColor"
        className="transition-all duration-200"
      />
    </Icon>
  );
}

export function SplitIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <rect x="3" y="4" width="7" height="16" rx="1.5" />
      <rect x="14" y="4" width="7" height="16" rx="1.5" />
    </Icon>
  );
}

export function UnifiedIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <line x1="7.5" y1="8.5" x2="16.5" y2="8.5" />
      <line x1="7.5" y1="12" x2="16.5" y2="12" />
      <line x1="7.5" y1="15.5" x2="16.5" y2="15.5" />
    </Icon>
  );
}

export function WrapIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M4 6h16" />
      <path d="M4 12h11a3.5 3.5 0 0 1 0 7h-3.5" />
      <path d="M13.5 16.5 11 19l2.5 2.5" />
    </Icon>
  );
}

export function LineNumbersIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      {/* A numbered gutter: marks stand in for the numbers, which would be
          illegible at this size. */}
      <circle cx="4.75" cy="6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="4.75" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="4.75" cy="18" r="0.9" fill="currentColor" stroke="none" />
      <path d="M8 4.5v15" />
      <line x1="11" y1="6" x2="20" y2="6" />
      <line x1="11" y1="12" x2="20" y2="12" />
      <line x1="11" y1="18" x2="20" y2="18" />
    </Icon>
  );
}

export function FontSizeIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      {/* A large A beside a small one. */}
      <path d="M3 19 7.5 6 12 19" />
      <path d="M4.6 15.4h5.8" />
      <path d="M14.5 19l3-8.5 3 8.5" />
      <path d="M15.6 16.6h3.8" />
    </Icon>
  );
}

export function LineSpacingIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <line x1="11" y1="6" x2="21" y2="6" />
      <line x1="11" y1="12" x2="21" y2="12" />
      <line x1="11" y1="18" x2="21" y2="18" />
      <path d="M5 4.5v15" />
      <path d="M2.5 7 5 4.5 7.5 7" />
      <path d="M2.5 17 5 19.5 7.5 17" />
    </Icon>
  );
}

export function BranchIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <circle cx="7" cy="6" r="2.5" />
      <circle cx="7" cy="18" r="2.5" />
      <circle cx="17" cy="7" r="2.5" />
      <path d="M7 8.5v7" />
      <path d="M14.5 8c-4.5 0-7.5 1.5-7.5 7" />
    </Icon>
  );
}

export function ExportIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M12 4v12" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M5 20h14" />
    </Icon>
  );
}

export function CloseIcon({ size, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </Icon>
  );
}

export function MinusIcon({ size, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <path d="M6 12h12" />
    </Icon>
  );
}

export function PlusIcon({ size, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <path d="M12 6v12" />
      <path d="M6 12h12" />
    </Icon>
  );
}

export function CheckIcon({ size, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <path d="M5 12l5 5 9-9" />
    </Icon>
  );
}

export function ChevronRightIcon({ size, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <path d="M9 5l7 7-7 7" />
    </Icon>
  );
}

export function CommentIcon({ size, className }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-5 4V5z" />
    </Icon>
  );
}

export function SidebarIcon({ collapsed, size }: { collapsed: boolean } & IconProps) {
  return (
    <Icon size={size}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="9" y1="4" x2="9" y2="20" />
      {collapsed ? null : (
        <>
          <line x1="5.5" y1="9" x2="6.5" y2="9" opacity="0.5" />
          <line x1="5.5" y1="12.5" x2="6.5" y2="12.5" opacity="0.5" />
        </>
      )}
    </Icon>
  );
}

/** Sun or moon, showing the theme the toggle would switch *to*. */
export function ThemeIcon({ theme, size }: { theme: "light" | "dark" } & IconProps) {
  if (theme === "dark") {
    return (
      <Icon size={size}>
        <path d="M20.5 14.8A8.7 8.7 0 0 1 9.2 3.5a8.7 8.7 0 1 0 11.3 11.3z" />
      </Icon>
    );
  }
  return (
    <Icon size={size}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2" />
      <path d="M12 19.3v2.2" />
      <path d="M4.8 4.8l1.6 1.6" />
      <path d="M17.6 17.6l1.6 1.6" />
      <path d="M2.5 12h2.2" />
      <path d="M19.3 12h2.2" />
      <path d="M4.8 19.2l1.6-1.6" />
      <path d="M17.6 6.4l1.6-1.6" />
    </Icon>
  );
}

export function PencilIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M17 3l4 4L8 20H4v-4L17 3z" />
      <path d="M14.5 5.5 18.5 9.5" />
    </Icon>
  );
}

export function UserIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </Icon>
  );
}

export function AgentIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <rect x="4" y="7" width="16" height="12" rx="3" />
      <circle cx="9" cy="13" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1.4" fill="currentColor" stroke="none" />
      <path d="M8.5 4v3" />
      <path d="M15.5 4v3" />
    </Icon>
  );
}

/* Brand marks: the exception to the drawing rules above. These are other
   people's logotypes, so they keep their own fixed, filled geometry and only
   share the render size. */

export function GitHubIcon({ size = ICON_SIZE }: IconProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function GitLabIcon({ size = ICON_SIZE }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 -1 26 26"
    >
      <path d="M12.906 24 .403 14.723a1.07 1.07 0 0 1-.351-.497l-.002-.008a.926.926 0 0 1 .002-.609l-.002.007 1.463-4.437zM5.293.354l2.874 8.823H1.512L4.335.354a.52.52 0 0 1 .49-.353h.015-.001L4.865 0c.212 0 .388.151.427.351v.003zm2.874 8.823h9.479L12.907 24zm17.595 4.436a.926.926 0 0 1-.002.609l.002-.007a1.07 1.07 0 0 1-.351.503l-.002.002L12.906 24 24.3 9.177zM21.477.354 24.3 9.177h-6.655L20.519.354a.436.436 0 0 1 .455-.353h-.001.014c.227 0 .419.146.489.349z" />
    </svg>
  );
}
