import {
  DISPLAY_SETTINGS_DEFAULTS,
  type DisplaySettings,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
} from "@shared/types.js";
import {
  createContext,
  createElement,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { fetchSettings, patchSettings, patchSettingsOnUnload } from "./api";

export type { DisplaySettings };
export { FONT_SIZE_MAX, FONT_SIZE_MIN, LINE_HEIGHT_MAX, LINE_HEIGHT_MIN };

/** Long enough that holding down a stepper button is one request. */
const PATCH_DEBOUNCE_MS = 300;

interface SettingsContextValue {
  state: DisplaySettings;
  /** `--theme`: shadows `state.theme` for this session without replacing it. */
  sessionTheme: "light" | "dark" | null;
  actions: {
    update: <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => void;
  };
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface Hydrated {
  settings: DisplaySettings;
  sessionTheme: "light" | "dark" | null;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState<Hydrated | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then(({ settings, sessionTheme }) => {
        if (cancelled) return;
        setHydrated({ settings, sessionTheme: sessionTheme ?? null });
      })
      .catch(() => {
        if (cancelled) return;
        // Persistence is a convenience, never a prerequisite.
        setHydrated({ settings: DISPLAY_SETTINGS_DEFAULTS, sessionTheme: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // One pending timer per key, so edits to different settings never cancel each
  // other. `pending` mirrors them as values, because a timer cannot be read back.
  const timersRef = useRef(new Map<keyof DisplaySettings, ReturnType<typeof setTimeout>>());
  const pendingRef = useRef<Partial<DisplaySettings>>({});

  // Flush a debounce window that would otherwise outlive the page. `pagehide` is
  // the last point a request can still be issued: `unload` never fires on mobile
  // Safari, and `visibilitychange` would flush on every tab switch.
  useEffect(() => {
    const flush = () => {
      const pending = pendingRef.current;
      if (Object.keys(pending).length === 0) return;
      pendingRef.current = {};
      for (const timer of timersRef.current.values()) clearTimeout(timer);
      timersRef.current.clear();
      patchSettingsOnUnload(pending);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const update = useCallback(
    <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
      setHydrated((prev) =>
        prev === null
          ? prev
          : {
              settings: { ...prev.settings, [key]: value },
              // An explicit choice outranks the flag for the rest of the session.
              sessionTheme: key === "theme" ? null : prev.sessionTheme,
            },
      );

      pendingRef.current[key] = value;
      const timers = timersRef.current;
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          delete pendingRef.current[key];
          patchSettings({ [key]: value } as Partial<DisplaySettings>).catch(() => {
            // No disk or no server: the setting still applies to this session.
          });
        }, PATCH_DEBOUNCE_MS),
      );
    },
    [],
  );

  if (hydrated === null) return null;

  return createElement(
    SettingsContext.Provider,
    {
      value: { state: hydrated.settings, sessionTheme: hydrated.sessionTheme, actions: { update } },
    },
    children,
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = use(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
