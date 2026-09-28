import { describe, expect, test } from "bun:test";
import { folderImageSrc } from "./folderImage";

const served = (path: string) => `/api/folder/image?path=${encodeURIComponent(path)}`;

describe("folderImageSrc", () => {
  test("resolves a relative src against the file's directory", () => {
    expect(folderImageSrc("docs/guide.md", "img/a.png")).toBe(served("docs/img/a.png"));
    expect(folderImageSrc("docs/guide.md", "./a.png")).toBe(served("docs/a.png"));
    expect(folderImageSrc("docs/deep/guide.md", "../a.png")).toBe(served("docs/a.png"));
  });

  test("resolves a root-relative src against the folder root", () => {
    expect(folderImageSrc("docs/guide.md", "/assets/a.png")).toBe(served("assets/a.png"));
  });

  test("never climbs above the root", () => {
    expect(folderImageSrc("guide.md", "../../etc/a.png")).toBe(served("etc/a.png"));
  });

  test("decodes escapes and keeps special characters in the file path", () => {
    expect(folderImageSrc("my docs/#1.md", "a%20b.png")).toBe(served("my docs/a b.png"));
  });

  test("leaves URLs with a scheme or host as written", () => {
    for (const src of ["https://x.dev/a.png", "//x.dev/a.png", "data:image/png;base64,AA", ""]) {
      expect(folderImageSrc("docs/guide.md", src)).toBe(src);
    }
  });
});
