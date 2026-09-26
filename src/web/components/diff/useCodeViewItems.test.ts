import { describe, expect, test } from "bun:test";
import {
  contentSig,
  fileContents,
  nextVersionMap,
  seedMissingVersions,
  type VersionMap,
} from "./useCodeViewItems";

/** Signature lookup standing in for `computeSig`. */
const sigOf = (sigs: Record<string, string>) => (id: string) => sigs[id] ?? "missing";

describe("seedMissingVersions", () => {
  test("tracks unseen ids at version 0 and preserves their order", () => {
    const versions: VersionMap = new Map();
    const emitted = seedMissingVersions(["a", "b"], sigOf({ a: "a1", b: "b1" }), versions);

    expect(emitted).toEqual([0, 0]);
    expect([...versions.keys()]).toEqual(["a", "b"]);
    expect(versions.get("a")).toEqual({ sig: "a1", n: 0 });
  });

  test("leaves an already tracked entry untouched, stale signature included", () => {
    const versions: VersionMap = new Map([["a", { sig: "a1", n: 3 }]]);
    // Same id, but its content has since changed.
    const emitted = seedMissingVersions(["a"], sigOf({ a: "a2" }), versions);

    expect(emitted).toEqual([3]);
    // The stored signature must stay "a1" so the next reconcile still sees a
    // difference and bumps. Overwriting it here would silently strand the
    // viewer on the old contents.
    expect(versions.get("a")).toEqual({ sig: "a1", n: 3 });
  });
});

describe("nextVersionMap", () => {
  test("keeps the version of files whose signature is unchanged", () => {
    const previous: VersionMap = new Map([
      ["a", { sig: "a1", n: 2 }],
      ["b", { sig: "b1", n: 5 }],
    ]);
    const { versions, emitted } = nextVersionMap(["a", "b"], sigOf({ a: "a1", b: "b1" }), previous);

    expect(emitted).toEqual([2, 5]);
    expect(versions.get("a")).toEqual({ sig: "a1", n: 2 });
  });

  test("bumps the version of a file whose contents changed", () => {
    const previous: VersionMap = new Map([["a", { sig: "a1", n: 2 }]]);
    const { versions, emitted } = nextVersionMap(["a"], sigOf({ a: "a2" }), previous);

    expect(emitted).toEqual([3]);
    expect(versions.get("a")).toEqual({ sig: "a2", n: 3 });
  });

  test("starts new files at 0 and drops files that are gone", () => {
    const previous: VersionMap = new Map([
      ["a", { sig: "a1", n: 2 }],
      ["gone", { sig: "g1", n: 9 }],
    ]);
    const { versions, emitted } = nextVersionMap(
      ["a", "new"],
      sigOf({ a: "a1", new: "n1" }),
      previous,
    );

    expect(emitted).toEqual([2, 0]);
    expect(versions.has("gone")).toBe(false);
    expect(versions.get("new")).toEqual({ sig: "n1", n: 0 });
  });

  test("reports files in the given order, so a file inserted mid-list lands in place", () => {
    const previous: VersionMap = new Map([
      ["a", { sig: "a1", n: 1 }],
      ["c", { sig: "c1", n: 1 }],
    ]);
    const { versions } = nextVersionMap(
      ["a", "b", "c"],
      sigOf({ a: "a1", b: "b1", c: "c1" }),
      previous,
    );

    expect([...versions.keys()]).toEqual(["a", "b", "c"]);
  });

  test("a reorder alone reuses every record", () => {
    const previous: VersionMap = new Map([
      ["a", { sig: "a1", n: 4 }],
      ["b", { sig: "b1", n: 7 }],
    ]);
    const { versions, emitted } = nextVersionMap(["b", "a"], sigOf({ a: "a1", b: "b1" }), previous);

    expect(emitted).toEqual([7, 4]);
    expect([...versions.keys()]).toEqual(["b", "a"]);
  });

  test("seed-then-reconcile bumps a file edited between the two passes", () => {
    // The real sequence on a refresh: `initialItems` runs during render, then
    // the reconcile effect runs against the same map.
    const versions: VersionMap = new Map();
    seedMissingVersions(["a"], sigOf({ a: "a1" }), versions);
    const { emitted } = nextVersionMap(["a"], sigOf({ a: "a2" }), versions);

    expect(emitted).toEqual([1]);
  });

  test("a reconcile with nothing changed emits no new versions", () => {
    const versions: VersionMap = new Map();
    seedMissingVersions(["a", "b"], sigOf({ a: "a1", b: "b1" }), versions);
    const { emitted } = nextVersionMap(["a", "b"], sigOf({ a: "a1", b: "b1" }), versions);

    expect(emitted).toEqual([0, 0]);
  });
});

describe("folder file items", () => {
  test("an unloaded file renders as empty plain text", () => {
    expect(fileContents("docs/a.md", undefined)).toEqual({
      name: "docs/a.md",
      contents: "",
      lang: "text",
    });
  });

  test("a load error renders its message as plain text", () => {
    expect(fileContents("big.log", { status: "error", message: "Too large" })).toEqual({
      name: "big.log",
      contents: "Too large",
      lang: "text",
    });
  });

  test("a loaded file keeps its name for language inference", () => {
    expect(fileContents("src/a.ts", { status: "loaded", content: "const a = 1;" })).toEqual({
      name: "src/a.ts",
      contents: "const a = 1;",
    });
  });

  test("the signature changes when the file finishes loading", () => {
    const pending = contentSig({ type: "file", name: "a.md", file: undefined });
    const loaded = contentSig({
      type: "file",
      name: "a.md",
      file: { status: "loaded", content: "# a" },
    });
    expect(pending).not.toBe(loaded);
  });
});
