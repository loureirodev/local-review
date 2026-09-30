import { IS_MAC } from "../utils/platform";

export const SHORTCUT_GROUPS = ["Navigation", "Comments", "General"] as const;

export type ShortcutId = "focusSearch" | "nextComment" | "prevComment" | "help" | "toggleSidebar";

export interface Shortcut {
  id: ShortcutId;
  /** Display keys, pressed together; `Mod` is `⌘` on macOS and `Ctrl` elsewhere. */
  keys: string[];
  description: string;
  group: (typeof SHORTCUT_GROUPS)[number];
  match: (e: KeyboardEvent) => boolean;
  /** No modifier: ignored while typing. */
  plain: boolean;
}

const noModifier = (e: KeyboardEvent) => !e.ctrlKey && !e.metaKey && !e.altKey;

/** Matched on `e.key`, so a key typed with Shift on some layouts (`/`, `?`)
 *  still matches. */
const plainKey = (key: string) => (e: KeyboardEvent) => noModifier(e) && e.key === key;

/** Every global shortcut. The key handler and the help dialog both read this,
 *  so a shortcut added here is documented by construction. */
export const SHORTCUTS: readonly Shortcut[] = [
  {
    id: "focusSearch",
    keys: ["/"],
    description: "Search files or comments",
    group: "Navigation",
    match: plainKey("/"),
    plain: true,
  },
  {
    id: "toggleSidebar",
    keys: ["Mod", "B"],
    description: "Toggle sidebar",
    group: "Navigation",
    match: (e) =>
      (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "b",
    plain: false,
  },
  {
    id: "nextComment",
    keys: ["n"],
    description: "Next comment",
    group: "Comments",
    match: plainKey("n"),
    plain: true,
  },
  {
    id: "prevComment",
    keys: ["p"],
    description: "Previous comment",
    group: "Comments",
    match: plainKey("p"),
    plain: true,
  },
  {
    id: "help",
    keys: ["?"],
    description: "Show keyboard shortcuts",
    group: "General",
    match: plainKey("?"),
    plain: true,
  },
];

export function keyLabel(key: string): string {
  return key === "Mod" ? (IS_MAC ? "⌘" : "Ctrl") : key;
}

/** One-line label for a tooltip, e.g. `Ctrl+B`. */
export function shortcutLabel(id: ShortcutId): string {
  const shortcut = SHORTCUTS.find((s) => s.id === id);
  return shortcut ? shortcut.keys.map(keyLabel).join("+") : "";
}
