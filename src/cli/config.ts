// Display settings persisted on the user's machine.
// `localStorage` is partitioned by origin and the server binds a random port on
// every launch, so the browser starts with an empty store each time.

import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  DISPLAY_SETTINGS_DEFAULTS,
  DISPLAY_SETTINGS_VALIDATORS,
  type DisplaySettings,
  isDisplaySettingsKey,
} from "../shared/types";

/** Everything on disk, including keys this version doesn't know about. */
type StoredSettings = Record<string, unknown>;

/** `~/.config` even on macOS: an XDG-style path is what users of a terminal tool
 *  expect, and it is editable by hand. */
export function getConfigPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return join(xdg, "local-review", "settings.json");

  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (appData) return join(appData, "local-review", "settings.json");
  }

  return join(homedir() ?? tmpdir(), ".config", "local-review", "settings.json");
}

/** A missing, unreadable or malformed file all yield an empty store: nothing
 *  here may keep the app from starting. */
async function readStored(): Promise<StoredSettings> {
  try {
    const parsed: unknown = JSON.parse(await readFile(getConfigPath(), "utf-8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as StoredSettings;
  } catch {
    return {};
  }
}

/** Narrow a stored object onto the defaults. A value that fails validation (a
 *  hand-edited file, a future version's wider range) falls back to its default. */
function coerce(stored: StoredSettings): DisplaySettings {
  const result = { ...DISPLAY_SETTINGS_DEFAULTS };
  for (const [key, value] of Object.entries(stored)) {
    if (!isDisplaySettingsKey(key)) continue;
    // The cast is what lets the per-key assignment typecheck across the union.
    if (DISPLAY_SETTINGS_VALIDATORS[key](value as never)) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/** Stored settings merged over the defaults. */
export async function readSettings(): Promise<DisplaySettings> {
  return coerce(await readStored());
}

/** Past this, a lock is treated as abandoned by a crashed process. */
const LOCK_STALE_MS = 5_000;
const LOCK_RETRY_MS = 20;
const LOCK_TIMEOUT_MS = 1_000;

/** Advisory lock around the read-merge-write: `rename` makes the write atomic,
 *  but read and write are two syscalls that two instances can interleave.
 *  Giving up after the timeout falls back to the unlocked path, since never
 *  writing at all is worse than losing a display setting to a race. */
async function withLock<T>(lockPath: string, fn: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  let held = false;

  while (Date.now() < deadline) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.close();
      held = true;
      break;
    } catch {
      try {
        const { mtimeMs } = await stat(lockPath);
        if (Date.now() - mtimeMs > LOCK_STALE_MS) await rm(lockPath, { force: true });
      } catch {
        // Lock vanished between the two calls; retry.
      }
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }

  try {
    return await fn();
  } finally {
    if (held) await rm(lockPath, { force: true }).catch(() => {});
  }
}

/**
 * Apply a partial update and return the merged settings.
 *
 * Read-merge-write, so two instances editing different keys both survive, and
 * unknown keys from a newer version are carried through untouched. Temp file
 * plus `rename` keeps a concurrent reader from seeing truncated JSON; the temp
 * name is unique per call because `withLock` can let two writes overlap.
 * A failed write still returns the merge, so a read-only disk only costs
 * persistence.
 */
export async function patchSettings(patch: Partial<DisplaySettings>): Promise<DisplaySettings> {
  const path = getConfigPath();
  const tempPath = `${path}.${process.pid}.${randomUUID()}.tmp`;

  try {
    await mkdir(dirname(path), { recursive: true });
  } catch {
    // Not writable; the read below still yields the defaults.
  }

  return withLock(`${path}.lock`, async () => {
    const merged: StoredSettings = { ...(await readStored()), ...patch };
    try {
      await writeFile(tempPath, `${JSON.stringify(merged, null, 2)}\n`, "utf-8");
      await rename(tempPath, path);
    } catch {
      // Disk not writable: the session keeps working, it just won't be restored.
    }
    return coerce(merged);
  });
}
