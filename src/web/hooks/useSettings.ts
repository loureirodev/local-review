import {
  createContext,
  createElement,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "local-review-settings:v1";

export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 20;
export const LINE_HEIGHT_MIN = 14;
export const LINE_HEIGHT_MAX = 32;

export interface DisplaySettings {
  diffStyle: "split" | "unified";
  wrapLines: boolean;
  showLineNumbers: boolean;
  nestedTree: boolean;
  fontSize: number;
  lineHeight: number;
}

const defaults: DisplaySettings = {
  diffStyle: "split",
  wrapLines: true,
  showLineNumbers: true,
  nestedTree: false,
  fontSize: 13,
  lineHeight: 20,
};

interface SettingsContextValue {
  state: DisplaySettings;
  actions: {
    update: <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => void;
  };
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setSettingsState] = useState<DisplaySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaults, ...JSON.parse(stored) } : { ...defaults };
    } catch {
      return { ...defaults };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage unavailable — silently ignore
    }
  }, [state]);

  const update = useCallback(
    <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
      setSettingsState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return createElement(
    SettingsContext.Provider,
    { value: { state, actions: { update } } },
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
