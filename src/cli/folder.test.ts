import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listFolder, MAX_FILE_BYTES, readFolderFile } from "./folder";

let base: string;
let root: string;

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), "local-review-folder-"));
  root = join(base, "root");
  await mkdir(root);
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

describe("listFolder", () => {
  test("lists nested text files with forward-slash relative paths", async () => {
    await mkdir(join(root, "docs/guides"), { recursive: true });
    await writeFile(join(root, "README.md"), "# hi");
    await writeFile(join(root, "docs/guides/setup.md"), "steps");

    expect(await listFolder(root)).toEqual({
      paths: ["README.md", "docs/guides/setup.md"],
      skipped: { binary: 0, oversized: 0 },
    });
  });

  test("returns an empty listing for an empty folder", async () => {
    expect(await listFolder(root)).toEqual({ paths: [], skipped: { binary: 0, oversized: 0 } });
  });

  test("skips binaries by extension and by null bytes", async () => {
    await writeFile(join(root, "logo.png"), "not really a png");
    await writeFile(join(root, "blob.dat"), Buffer.from([0x61, 0x00, 0x62]));
    await writeFile(join(root, "notes.txt"), "text");

    expect(await listFolder(root)).toEqual({
      paths: ["notes.txt"],
      skipped: { binary: 2, oversized: 0 },
    });
  });

  test("skips files over the size cap", async () => {
    await writeFile(join(root, "big.log"), "a".repeat(MAX_FILE_BYTES + 1));

    expect(await listFolder(root)).toEqual({ paths: [], skipped: { binary: 0, oversized: 1 } });
  });

  test("ignores the .git directory and symlinks escaping the root", async () => {
    await mkdir(join(root, ".git"));
    await writeFile(join(root, ".git/HEAD"), "ref: refs/heads/main");
    await writeFile(join(base, "secret.txt"), "outside");
    await symlink(join(base, "secret.txt"), join(root, "escape.txt"));
    await writeFile(join(root, "kept.txt"), "inside");

    expect((await listFolder(root)).paths).toEqual(["kept.txt"]);
  });

  // Root reads through any permission, so the case can't be reproduced there.
  test.skipIf(process.getuid?.() === 0)("skips unreadable entries instead of failing", async () => {
    await mkdir(join(root, "locked"));
    await writeFile(join(root, "locked/a.txt"), "a");
    await writeFile(join(root, "secret.txt"), "s");
    await writeFile(join(root, "kept.txt"), "k");
    await chmod(join(root, "locked"), 0o000);
    await chmod(join(root, "secret.txt"), 0o000);
    try {
      expect((await listFolder(root)).paths).toEqual(["kept.txt"]);
      expect(await readFolderFile(root, "secret.txt")).toEqual({ error: "not-found" });
    } finally {
      await chmod(join(root, "locked"), 0o755);
    }
  });
});

describe("readFolderFile", () => {
  test("returns the content of a file under the root", async () => {
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "docs/a.md"), "hello");

    expect(await readFolderFile(root, "docs/a.md")).toEqual({ content: "hello" });
  });

  test("rejects traversal and absolute paths", async () => {
    await writeFile(join(base, "secret.txt"), "outside");

    expect(await readFolderFile(root, "../secret.txt")).toEqual({ error: "traversal" });
    expect(await readFolderFile(root, "docs/../../secret.txt")).toEqual({ error: "traversal" });
    expect(await readFolderFile(root, join(base, "secret.txt"))).toEqual({ error: "traversal" });
  });

  test("rejects symlinks resolving outside the root", async () => {
    await writeFile(join(base, "secret.txt"), "outside");
    await symlink(join(base, "secret.txt"), join(root, "escape.txt"));

    expect(await readFolderFile(root, "escape.txt")).toEqual({ error: "traversal" });
  });

  test("reports missing, binary and oversized files", async () => {
    await writeFile(join(root, "img.png"), "x");
    await writeFile(join(root, "big.txt"), "a".repeat(MAX_FILE_BYTES + 1));

    expect(await readFolderFile(root, "nope.md")).toEqual({ error: "not-found" });
    expect(await readFolderFile(root, "img.png")).toEqual({ error: "binary" });
    expect(await readFolderFile(root, "big.txt")).toEqual({ error: "too-large" });
  });
});
