import { useEffect } from "react";

/** Setup on mount, cleanup on unmount: for syncing with an external system
 *  whose handle never changes. Anything else should not be an effect. */
export function useMountEffect(effect: () => undefined | (() => void)) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once by design
  useEffect(effect, []);
}
