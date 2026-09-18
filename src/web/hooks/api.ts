// Fetch wrapper for the API

import type {
  DiffMode,
  DiffResponse,
  DisplaySettings,
  ReviewState,
  SettingsResponse,
} from "@shared/types.js";

const BASE = "";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function fetchDiff(): Promise<DiffResponse> {
  return api("/api/diff");
}

export function changeDiffMode(mode: DiffMode): Promise<void> {
  return api("/api/diff/mode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
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
