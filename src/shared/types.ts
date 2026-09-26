// Shared type definitions between CLI server and web frontend.

// ===== Diff Source Types =====

/** Git revision a review was made against. Optional: older or hand-written
 *  reviews lack it, and the skill skips its branch check then. */
interface GitRef {
  /** Branch name. */
  head?: string;
  /** Full SHA of `HEAD`. */
  commit?: string;
}

/** Launch mode (`branch`, `pending`, `folder`) or imported origin of a review.
 *  `base` on forge sources is the PR/MR target branch. */
export type DiffSource =
  | ({ type: "branch"; base: string } & GitRef)
  | ({ type: "pending"; staged: boolean } & GitRef)
  | { type: "folder"; path: string }
  | ({ type: "github-pr"; owner: string; repo: string; pr: number; base?: string } & GitRef)
  | ({ type: "gitlab-mr"; project: string; mr: number; base?: string } & GitRef)
  | ({ type: "agent"; agent?: string } & GitRef);

/** Sources produced by the CLI itself, i.e. the mode fixed at launch. */
export type LaunchSource = Extract<DiffSource, { type: "branch" | "pending" | "folder" }>;

// ===== Review Types =====

export interface ReviewComment {
  id: string;
  filePath: string;
  /** Line in the view (1-based): diff line in branch/pending modes, file line in
   *  folder mode. null = file-level comment. */
  line: number | null;
  /** Which side of the diff this comment is on. Always null in folder mode. */
  side: "addition" | "deletion" | null;
  body: string;
  createdAt: string;
  /** URL to the original comment on the forge (GitHub/GitLab). */
  url?: string;
  /** Whether this comment was edited locally after being imported from a forge. */
  edited?: boolean;
}

export interface FileReviewState {
  path: string;
  viewed: boolean;
  comments: ReviewComment[];
}

export interface ReviewState {
  timestamp: string;
  source: DiffSource;
  files: FileReviewState[];
}

// ===== API Types =====

interface RepoInfo {
  branch: string;
  repoRoot: string;
}

export interface DiffResponse {
  patch: string;
  source: Extract<DiffSource, { type: "branch" | "pending" }>;
  info: RepoInfo;
}

/** The mode the CLI was launched in. Fetched first: it decides which data
 *  endpoints the UI calls. */
export interface SessionResponse {
  source: LaunchSource;
}

/** Folder mode's per-file cap: larger files are left out of the listing. */
export const FOLDER_FILE_MAX_MB = 1;

export interface FolderTreeResponse {
  paths: string[];
  skipped: { binary: number; oversized: number };
}

export interface ApiError {
  error: string;
}

/** `sessionTheme` stays out of band: `--theme` must not arrive as `settings.theme`,
 *  or the next theme write would persist a value the reviewer never chose. */
export interface SettingsResponse {
  settings: DisplaySettings;
  sessionTheme?: "light" | "dark";
}

// The persisted display settings. Shared: the web UI renders from them, and the
// CLI validates every PATCH against them before touching the config file.

export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 20;
export const LINE_HEIGHT_MIN = 14;
export const LINE_HEIGHT_MAX = 32;

export interface DisplaySettings {
  diffStyle: "split" | "unified";
  /** `"system"` defers to `prefers-color-scheme`; resolved by `useTheme()`. */
  theme: "light" | "dark" | "system";
  wrapLines: boolean;
  showLineNumbers: boolean;
  fontSize: number;
  lineHeight: number;
}

export const DISPLAY_SETTINGS_DEFAULTS: DisplaySettings = {
  diffStyle: "split",
  theme: "system",
  wrapLines: true,
  showLineNumbers: true,
  fontSize: 13,
  lineHeight: 20,
};

/** An unknown or out-of-range key rejects the whole `PATCH` rather than being
 *  silently dropped. */
export const DISPLAY_SETTINGS_VALIDATORS: {
  [K in keyof DisplaySettings]: (value: unknown) => value is DisplaySettings[K];
} = {
  diffStyle: (v): v is DisplaySettings["diffStyle"] => v === "split" || v === "unified",
  theme: (v): v is DisplaySettings["theme"] => v === "light" || v === "dark" || v === "system",
  wrapLines: (v): v is boolean => typeof v === "boolean",
  showLineNumbers: (v): v is boolean => typeof v === "boolean",
  fontSize: (v): v is number =>
    typeof v === "number" && Number.isInteger(v) && v >= FONT_SIZE_MIN && v <= FONT_SIZE_MAX,
  lineHeight: (v): v is number =>
    typeof v === "number" && Number.isInteger(v) && v >= LINE_HEIGHT_MIN && v <= LINE_HEIGHT_MAX,
};

export function isDisplaySettingsKey(key: string): key is keyof DisplaySettings {
  return Object.hasOwn(DISPLAY_SETTINGS_VALIDATORS, key);
}
