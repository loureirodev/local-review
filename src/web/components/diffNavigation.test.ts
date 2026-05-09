import { describe, expect, test } from "bun:test";
import { getFileSectionId } from "./diffNavigation";

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
