import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useSettings } from "./useSettings";

/** What the reviewer asked for. `"system"` defers to the environment. */
export type ThemeOverride = "light" | "dark" | "system";
/** What actually gets painted, once the override and the environment are resolved. */
export type ResolvedTheme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** Matches the bare `:root` palette in index.css, which is the light one. */
function getServerTheme(): ResolvedTheme {
  return "light";
}

interface UseThemeResult {
  /** The theme in effect right now, as the shadow-DOM surfaces need it. */
  theme: ResolvedTheme;
  /** The stored preference, including `"system"`. */
  override: ThemeOverride;
  setOverride: (next: ThemeOverride) => void;
}

/**
 * Resolves the active theme and mirrors the override onto `<html data-theme>`.
 *
 * The attribute drives plain CSS; the returned `theme` drives `@pierre/trees`
 * and `@pierre/diffs`, which take a JavaScript value rather than a selector.
 */
export function useTheme(): UseThemeResult {
  const {
    state: { theme: storedTheme },
    sessionTheme,
    actions,
  } = useSettings();

  // `--theme` shadows the stored preference for this session without replacing
  // it, so only the reviewer's own choice ever reaches disk.
  const override: ThemeOverride = sessionTheme ?? storedTheme;

  // Live: an OS-level theme switch has to repaint while the app is open, and a
  // media query alone can't tell React about it.
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme, getServerTheme);

  const theme: ResolvedTheme = override === "system" ? systemTheme : override;

  useEffect(() => {
    const root = document.documentElement;
    // No attribute is the "follow the environment" state: the media query in
    // index.css is written to win exactly when it is absent.
    if (override === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", override);
  }, [override]);

  const setOverride = useCallback(
    (next: ThemeOverride) => actions.update("theme", next),
    [actions],
  );

  return { theme, override, setOverride };
}
