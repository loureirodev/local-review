import { useCallback, useSyncExternalStore } from "react";

// One MediaQueryList per query: snapshots are read on every render.
const lists = new Map<string, MediaQueryList>();

function mediaQueryList(query: string): MediaQueryList {
  let list = lists.get(query);
  if (!list) {
    list = window.matchMedia(query);
    lists.set(query, list);
  }
  return list;
}

/** One-off read, for event handlers and initial state. */
export function matchesMediaQuery(query: string): boolean {
  return mediaQueryList(query).matches;
}

/** Whether `query` matches, re-rendering when it starts or stops matching. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = mediaQueryList(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => matchesMediaQuery(query),
    () => false,
  );
}
