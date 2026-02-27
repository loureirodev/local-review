// Shared type definitions between CLI server and web frontend.

// ===== Diff Source Types =====

export type DiffMode = "unstaged" | "staged" | "branch";

export type DiffSource =
  | { type: "local"; mode: DiffMode; args?: string[] }
  // Future: GitHub PR / GitLab MR support
  | { type: "github-pr"; owner: string; repo: string; pr: number }
  | { type: "gitlab-mr"; project: string; mr: number };

// ===== Review Types =====

export interface ReviewComment {
  id: string;
  filePath: string;
  /** Line number in the diff (1-based). null = file-level comment. */
  line: number | null;
  /** Which side of the diff this comment is on. */
  side: "addition" | "deletion" | null;
  body: string;
  createdAt: string;
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

export interface RepoInfo {
  branch: string;
  baseBranch: string;
  repoRoot: string;
}

export interface DiffResponse {
  patch: string;
  source: DiffSource;
  info: RepoInfo;
}

export interface ApiError {
  error: string;
}
