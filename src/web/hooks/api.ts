// Fetch wrapper for the API

import type {
  DiffResponse,
  DisplaySettings,
  FolderTreeResponse,
  ReviewState,
  SessionResponse,
  SettingsResponse,
} from "@shared/types.js";

const BASE = "";

/** A non-2xx response, with its status for callers that branch on it. */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new HttpError(body.error ?? `Request failed: ${res.status}`, res.status);
  }
  return res;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  return (await request(url, init)).json();
}

export function fetchSession(): Promise<SessionResponse> {
  return api("/api/session");
}

/** `staged` only matters in pending mode; branch mode ignores it. */
export function fetchDiff(staged = false): Promise<DiffResponse> {
  return api(`/api/diff${staged ? "?staged=true" : ""}`);
}

export function fetchFolderTree(): Promise<FolderTreeResponse> {
  return api("/api/folder/tree");
}

/** Raw text of one folder file. Rejects with an `HttpError` (404/413/415)
 *  carrying the server's message. */
export async function fetchFolderFile(path: string): Promise<string> {
  const res = await request(`/api/folder/file?path=${encodeURIComponent(path)}`);
  return res.text();
}

export function fetchReview(): Promise<ReviewState | null> {
  return api("/api/review");
}

export function submitReview(state: ReviewState): Promise<{ path: string }> {
  return api("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}

export function fetchSettings(): Promise<SettingsResponse> {
  return api("/api/settings");
}

/** Per-key rather than a whole-object write, so simultaneous instances editing
 *  different settings don't clobber each other. */
export function patchSettings(patch: Partial<DisplaySettings>): Promise<DisplaySettings> {
  return api("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

/** Same write, allowed to outlive the page. `sendBeacon` only issues POSTs,
 *  hence `keepalive`; fire-and-forget, there is no one left to answer. */
export function patchSettingsOnUnload(patch: Partial<DisplaySettings>): void {
  void fetch(`${BASE}/api/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
    keepalive: true,
  }).catch(() => {});
}
