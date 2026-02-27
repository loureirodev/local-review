// Fetch wrapper for the API

import type { DiffMode, DiffResponse, ReviewState } from "@shared/types.js";

const BASE = "";

export async function fetchDiff(): Promise<DiffResponse> {
  const res = await fetch(`${BASE}/api/diff`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to fetch diff");
  }
  return res.json();
}

export async function changeDiffMode(mode: DiffMode): Promise<void> {
  const res = await fetch(`${BASE}/api/diff/mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to change mode");
  }
}

export async function submitReview(
  state: ReviewState
): Promise<{ path: string }> {
  const res = await fetch(`${BASE}/api/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to submit review");
  }
  return res.json();
}
