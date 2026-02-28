import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "local-review-settings";

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

function load(): DisplaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

function save(settings: DisplaySettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<DisplaySettings>(load);

  // Persist on every change
  useEffect(() => {
    save(settings);
  }, [settings]);

  const update = useCallback(
    <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
      setSettingsState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return { settings, update } as const;
}
