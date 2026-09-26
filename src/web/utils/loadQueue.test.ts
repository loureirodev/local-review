import { describe, expect, test } from "bun:test";
import { createLoadQueue, type LoadOutcome } from "./loadQueue";

/** A `run` whose loads finish only when the test resolves them. */
function controlledRun() {
  const started: string[] = [];
  const pending = new Map<string, (outcome: LoadOutcome) => void>();
  const run = (key: string) =>
    new Promise<LoadOutcome>((resolve) => {
      started.push(key);
      pending.set(key, resolve);
    });
  const finish = async (key: string, outcome: LoadOutcome = "done") => {
    pending.get(key)?.(outcome);
    pending.delete(key);
    // Let the queue's then/finally chain settle.
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };
  return { started, run, finish };
}

describe("createLoadQueue", () => {
  test("keeps at most `limit` loads in flight", async () => {
    const { started, run, finish } = controlledRun();
    const queue = createLoadQueue(2, run);
    for (const key of ["a", "b", "c", "d"]) queue.request(key);
    expect(started).toEqual(["a", "b"]);
    await finish("a");
    expect(started).toEqual(["a", "b", "c"]);
  });

  test("loads each key once", async () => {
    const { started, run, finish } = controlledRun();
    const queue = createLoadQueue(1, run);
    queue.request("a");
    queue.request("a");
    await finish("a");
    queue.request("a");
    expect(started).toEqual(["a"]);
  });

  test("a priority request jumps the line", async () => {
    const { started, run, finish } = controlledRun();
    const queue = createLoadQueue(1, run);
    for (const key of ["a", "b", "c"]) queue.request(key);
    queue.request("c", true);
    await finish("a");
    expect(started).toEqual(["a", "c"]);
  });

  test("a retryable failure can be requested again", async () => {
    const { started, run, finish } = controlledRun();
    const queue = createLoadQueue(1, run);
    queue.request("a");
    await finish("a", "retry");
    queue.request("a");
    expect(started).toEqual(["a", "a"]);
  });
});
