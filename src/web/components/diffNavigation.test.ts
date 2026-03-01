import { describe, expect, test } from "bun:test";
import { getFileSectionId, pickActiveFile } from "./diffNavigation";

describe("getFileSectionId", () => {
  test("returns deterministic and unique ids for different paths", () => {
    const a = getFileSectionId("src/foo/index.ts");
    const b = getFileSectionId("src/bar/index.ts");
    const c = getFileSectionId("src/foo/index.ts");

    expect(a).toStartWith("diff-file-");
    expect(a).not.toBe(b);
    expect(a).toBe(c);
  });
});

describe("pickActiveFile", () => {
  test("returns null when no files are intersecting", () => {
    const active = pickActiveFile([
      { filePath: "a.ts", isIntersecting: false, top: -10 },
      { filePath: "b.ts", isIntersecting: false, top: 20 },
    ]);

    expect(active).toBeNull();
  });

  test("picks the file being scrolled through (top above viewport)", () => {
    const active = pickActiveFile([
      { filePath: "a.ts", isIntersecting: true, top: 180 },
      { filePath: "b.ts", isIntersecting: true, top: 12 },
      { filePath: "c.ts", isIntersecting: true, top: -30 },
    ]);

    // c.ts has top=-30: its header is just above the viewport top, so it's active
    expect(active).toBe("c.ts");
  });

  test("picks the most recently entered file when multiple are above viewport top", () => {
    const active = pickActiveFile([
      { filePath: "a.ts", isIntersecting: true, top: -400 },
      { filePath: "b.ts", isIntersecting: true, top: -10 },
    ]);

    // b.ts has top closest to 0 from below — most recently scrolled into
    expect(active).toBe("b.ts");
  });

  test("falls back to closest section below viewport top when nothing scrolled into yet", () => {
    const active = pickActiveFile([
      { filePath: "a.ts", isIntersecting: true, top: 200 },
      { filePath: "b.ts", isIntersecting: true, top: 50 },
    ]);

    expect(active).toBe("b.ts");
  });
});
