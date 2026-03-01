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

  test("picks the intersecting file closest to viewport top", () => {
    const active = pickActiveFile([
      { filePath: "a.ts", isIntersecting: true, top: 180 },
      { filePath: "b.ts", isIntersecting: true, top: 12 },
      { filePath: "c.ts", isIntersecting: true, top: -30 },
    ]);

    expect(active).toBe("b.ts");
  });
});
