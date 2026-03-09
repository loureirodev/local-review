// Fetch wrapper for the API

import type { DiffMode, DiffResponse, ReviewState } from "@shared/types.js";

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
