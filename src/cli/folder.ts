// Folder review mode: recursive listing and guarded reads under a root directory

import type { Dirent } from "node:fs";
import { open, readdir, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { FOLDER_FILE_MAX_MB, type FolderTreeResponse } from "../shared/types";

/** Files above this are left out of the listing and refused by `readFolderFile`. */
export const MAX_FILE_BYTES = FOLDER_FILE_MAX_MB * 1024 * 1024;
const SNIFF_BYTES = 8 * 1024;

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".mp3",
  ".mp4",
  ".mov",
  ".wav",
]);

/** Git's own bookkeeping is never review material. */
const SKIPPED_DIRS = new Set([".git"]);

export type FolderFileResult =
  | { content: string }
  | { error: "not-found" | "binary" | "too-large" | "traversal" };

/** Entries of one directory inspected at once: enough to overlap the per-file
 *  syscalls (slow on network or WSL mounts) without exhausting descriptors. */
const WALK_CONCURRENCY = 32;

type FileKind = "text" | "binary" | "too-large";

function isInside(root: string, target: string): boolean {
  return target === root || target.startsWith(root + sep);
}

function hasNullByte(bytes: Uint8Array): boolean {
  return bytes.subarray(0, SNIFF_BYTES).includes(0);
}

/** What the name and size alone tell; `undefined` means "sniff the content". */
function classifyByStat(path: string, size: number): FileKind | undefined {
  if (BINARY_EXTENSIONS.has(extname(path).toLowerCase())) return "binary";
  if (size > MAX_FILE_BYTES) return "too-large";
  return undefined;
}

async function sniff(path: string): Promise<FileKind> {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(SNIFF_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, SNIFF_BYTES, 0);
    return hasNullByte(buffer.subarray(0, bytesRead)) ? "binary" : "text";
  } finally {
    await handle.close();
  }
}

/** Every text file under `root`, relative, forward-slashed and sorted. Symlinks
 *  are followed only when they resolve inside `root`. */
export async function listFolder(root: string): Promise<FolderTreeResponse> {
  const realRoot = await realpath(root);
  const listing: FolderTreeResponse = { paths: [], skipped: { binary: 0, oversized: 0 } };
  const visitedDirs = new Set<string>();

  async function visit(dir: string, entry: Dirent): Promise<void> {
    const fullPath = join(dir, entry.name);
    let kind: FileKind;
    try {
      let target = fullPath;
      let isDirectory = entry.isDirectory();
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        target = await realpath(fullPath); // throws on a dangling link
        if (!isInside(realRoot, target)) return;
        const info = await stat(target);
        isDirectory = info.isDirectory();
        isFile = info.isFile();
      }
      if (isDirectory) {
        if (!SKIPPED_DIRS.has(entry.name)) await walk(fullPath);
        return;
      }
      if (!isFile) return;
      kind = classifyByStat(target, (await stat(target)).size) ?? (await sniff(target));
    } catch {
      return; // dangling link or unreadable file
    }

    if (kind === "binary") listing.skipped.binary++;
    else if (kind === "too-large") listing.skipped.oversized++;
    else listing.paths.push(relative(root, fullPath).split(sep).join("/"));
  }

  async function walk(dir: string): Promise<void> {
    let entries: Dirent[];
    try {
      const realDir = await realpath(dir);
      if (visitedDirs.has(realDir)) return;
      visitedDirs.add(realDir);
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // unreadable directory: skip it, not the whole listing
    }
    // Symlinks go last: a link to a directory already walked is dropped, so a
    // link beside its target lists the real path, not whichever finished first.
    const ordered = [
      ...entries.filter((e) => !e.isSymbolicLink()),
      ...entries.filter((e) => e.isSymbolicLink()),
    ];
    for (let i = 0; i < ordered.length; i += WALK_CONCURRENCY) {
      await Promise.all(ordered.slice(i, i + WALK_CONCURRENCY).map((e) => visit(dir, e)));
    }
  }

  await walk(root);
  // Entries finish in any order; sorting keeps the response deterministic.
  listing.paths.sort();
  return listing;
}

/** The real path of `relPath` under `root`, refusing anything that resolves
 *  outside it. */
async function resolveInRoot(
  root: string,
  relPath: string,
): Promise<string | { error: "not-found" | "traversal" }> {
  if (!relPath || isAbsolute(relPath) || relPath.split(/[\\/]/).includes("..")) {
    return { error: "traversal" };
  }
  const realRoot = await realpath(root);
  const candidate = resolve(root, relPath);
  if (!isInside(resolve(root), candidate)) return { error: "traversal" };

  let target: string;
  try {
    target = await realpath(candidate);
  } catch {
    return { error: "not-found" };
  }
  if (!isInside(realRoot, target)) return { error: "traversal" };
  return target;
}

/** Read one file under `root`, refusing anything that resolves outside it. */
export async function readFolderFile(root: string, relPath: string): Promise<FolderFileResult> {
  const target = await resolveInRoot(root, relPath);
  if (typeof target !== "string") return target;

  // An unreadable file answers like a missing one: there is nothing to show.
  try {
    const info = await stat(target);
    if (!info.isFile()) return { error: "not-found" };

    const kind = classifyByStat(target, info.size);
    if (kind === "binary") return { error: "binary" };
    if (kind === "too-large") return { error: "too-large" };
    // One read serves both the null-byte sniff and the content.
    const bytes = await Bun.file(target).bytes();
    if (hasNullByte(bytes)) return { error: "binary" };
    return { content: new TextDecoder().decode(bytes) };
  } catch {
    return { error: "not-found" };
  }
}

/** Images a markdown preview may embed from the folder, by extension. */
const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export type FolderImageResult =
  | { path: string; type: string }
  | { error: "not-found" | "traversal" | "unsupported" | "too-large" };

/** Locate an image under `root` for a markdown preview to embed. */
export async function resolveFolderImage(
  root: string,
  relPath: string,
): Promise<FolderImageResult> {
  const type = IMAGE_TYPES[extname(relPath).toLowerCase()];
  if (!type) return { error: "unsupported" };
  const target = await resolveInRoot(root, relPath);
  if (typeof target !== "string") return target;
  try {
    const info = await stat(target);
    if (!info.isFile()) return { error: "not-found" };
    if (info.size > MAX_IMAGE_BYTES) return { error: "too-large" };
    return { path: target, type };
  } catch {
    return { error: "not-found" };
  }
}
