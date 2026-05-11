import { useEffect, useState } from "react";

/** Returns a "display" copy of pinnedFile that lags 150 ms behind null,
 *  keeping the previous value alive long enough for the exit animation. */
export function usePinnedFile(pinnedFile: string | null): string | null {
  const [displayed, setDisplayed] = useState<string | null>(null);
  useEffect(() => {
    if (pinnedFile) {
      setDisplayed(pinnedFile);
      return;
    }
    if (displayed === null) return;
    const t = setTimeout(() => setDisplayed(null), 150);
    return () => clearTimeout(t);
  }, [pinnedFile, displayed]);
  return displayed;
}
