export type LoadOutcome = "done" | "retry";

export interface LoadQueue {
  /** Queue `key` unless it is already waiting, loading or loaded. `priority`
   *  moves it to the front, also when it is already waiting. */
  request: (key: string, priority?: boolean) => void;
}

/** Loads keys at most `limit` at a time, each once. A load that returns
 *  `"retry"` or throws is forgotten, so a later request fetches it again. */
export function createLoadQueue(
  limit: number,
  run: (key: string) => Promise<LoadOutcome>,
): LoadQueue {
  const waiting: string[] = [];
  /** Waiting, in flight or loaded. */
  const known = new Set<string>();
  let active = 0;

  function pump(): void {
    while (active < limit && waiting.length > 0) {
      const key = waiting.shift() as string;
      active++;
      run(key)
        .catch((): LoadOutcome => "retry")
        .then((outcome) => {
          if (outcome === "retry") known.delete(key);
        })
        .finally(() => {
          active--;
          pump();
        });
    }
  }

  return {
    request(key, priority = false) {
      if (known.has(key)) {
        // Only a priority request for a key still waiting has anything to do;
        // the O(1) check keeps repeated plain requests off the linear scan.
        const at = priority ? waiting.indexOf(key) : -1;
        if (at === -1) return;
        waiting.splice(at, 1);
      }
      known.add(key);
      if (priority) waiting.unshift(key);
      else waiting.push(key);
      pump();
    },
  };
}
