import { matchesMediaQuery, useMediaQuery } from "./useMediaQuery";

/** Below Tailwind's `md` (48rem): the layouts that switch with `max-md:` / `md:`. */
const NARROW_QUERY = "(max-width: 47.99rem)";

/** One-off read, for event handlers and initial state. */
export function isNarrowScreen(): boolean {
  return matchesMediaQuery(NARROW_QUERY);
}

/** Whether the viewport is phone-sized, kept in sync with the CSS breakpoint. */
export function useNarrowScreen(): boolean {
  return useMediaQuery(NARROW_QUERY);
}
