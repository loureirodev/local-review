import type { FileReviewState, ReviewWalkthrough, WalkthroughStep } from "@shared/types";
import { markdownToPlainText } from "./plainText";

/** A step kept against the diff. `id` is its index among the written steps:
 *  stable when a reload drops an earlier step, unlike its position here. */
export interface ResolvedStep extends WalkthroughStep {
  id: number;
}

/** A walkthrough checked against the loaded diff: steps hold only diff files,
 *  empty steps are gone, and every other diff file is in `other`. */
export interface ResolvedWalkthrough {
  intent: string;
  risk?: ReviewWalkthrough["risk"];
  steps: ResolvedStep[];
  /** Diff files in no step, in tree order. */
  other: string[];
  roles: Map<string, string>;
}

/** What the diff shows. `all` is the plain diff, outside the walkthrough: the
 *  Files view. Not persisted. */
export type WalkthroughFocus =
  | { kind: "intent" }
  | { kind: "step"; id: ResolvedStep["id"] }
  | { kind: "other" }
  | { kind: "all" };

export const ALL_FILES: WalkthroughFocus = { kind: "all" };
export const INTENT: WalkthroughFocus = { kind: "intent" };

/** `diffPaths` in tree order. A path is in at most one step: the parser keeps
 *  only its first occurrence. */
export function resolveWalkthrough(
  walkthrough: ReviewWalkthrough,
  diffPaths: readonly string[],
): ResolvedWalkthrough {
  const inDiff = new Set(diffPaths);
  const stepped = new Set<string>();
  const roles = new Map<string, string>();
  const steps: ResolvedStep[] = [];
  walkthrough.steps.forEach((step, id) => {
    const files = step.files.filter((f) => inDiff.has(f.path));
    if (files.length === 0) return;
    for (const file of files) {
      stepped.add(file.path);
      if (file.role) roles.set(file.path, file.role);
    }
    steps.push({ ...step, id, files });
  });
  const other = diffPaths.filter((p) => !stepped.has(p));
  return { intent: walkthrough.intent, risk: walkthrough.risk, steps, other, roles };
}

/** Every diff file in reading order: the steps', then Other changes. */
export function readingOrder(resolved: ResolvedWalkthrough): string[] {
  return [...resolved.steps.flatMap((s) => s.files.map((f) => f.path)), ...resolved.other];
}

/** Files the diff shows for `focus`, in reading order. None for the intent;
 *  `null` = every file in tree order, as without a walkthrough. */
export function focusPaths(
  resolved: ResolvedWalkthrough | null,
  focus: WalkthroughFocus,
): string[] | null {
  if (!resolved) return null;
  switch (focus.kind) {
    case "all":
      return null;
    case "intent":
      return [];
    case "step":
      return stepOf(resolved, focus)?.files.map((f) => f.path) ?? null;
    case "other":
      return resolved.other.length > 0 ? resolved.other : null;
  }
}

/** The step `focus` names; undefined when the diff no longer has it. */
export function stepOf(
  resolved: ResolvedWalkthrough,
  focus: WalkthroughFocus,
): ResolvedStep | undefined {
  return focus.kind === "step" ? resolved.steps.find((s) => s.id === focus.id) : undefined;
}

/** The step's 0-based place in the resolved list, as numbered on screen. */
export function stepPosition(resolved: ResolvedWalkthrough, focus: WalkthroughFocus): number {
  return focus.kind === "step" ? resolved.steps.findIndex((s) => s.id === focus.id) : -1;
}

const stepFocus = (step: ResolvedStep): WalkthroughFocus => ({ kind: "step", id: step.id });

/** The entry after the intent: the first step, or Other changes. */
export function firstEntry(resolved: ResolvedWalkthrough): WalkthroughFocus | null {
  if (resolved.steps.length > 0) return stepFocus(resolved.steps[0]);
  return resolved.other.length > 0 ? { kind: "other" } : null;
}

export function focusKey(focus: WalkthroughFocus): string {
  return focus.kind === "step" ? `step:${focus.id}` : focus.kind;
}

/** The step, or Other changes, holding `path`. */
export function entryOf(resolved: ResolvedWalkthrough, path: string): WalkthroughFocus {
  const step = resolved.steps.find((s) => s.files.some((f) => f.path === path));
  return step ? stepFocus(step) : { kind: "other" };
}

/** The focus to navigate to `path` with: the current one when it already
 *  shows the file, the entry holding the file otherwise. */
export function focusForPath(
  resolved: ResolvedWalkthrough | null,
  focus: WalkthroughFocus,
  path: string,
): WalkthroughFocus {
  if (!resolved || focus.kind === "all") return focus;
  return focusPaths(resolved, focus)?.includes(path) ? focus : entryOf(resolved, path);
}

/** The entry after `focus` in the list: the next step, or Other changes after
 *  the last one. `null` on the last entry and outside the walkthrough. */
export function nextEntry(
  resolved: ResolvedWalkthrough,
  focus: WalkthroughFocus,
): WalkthroughFocus | null {
  if (focus.kind === "intent") return firstEntry(resolved);
  if (focus.kind !== "step") return null;
  const position = stepPosition(resolved, focus);
  if (position === -1) return null;
  const next = resolved.steps[position + 1];
  if (next) return stepFocus(next);
  return resolved.other.length > 0 ? { kind: "other" } : null;
}

export function sameFocus(a: WalkthroughFocus, b: WalkthroughFocus): boolean {
  return focusKey(a) === focusKey(b);
}

/** Markdown as one line of plain text for an excerpt. Diagrams say nothing
 *  there, so they go. */
export function proseExcerpt(markdown: string): string {
  return markdownToPlainText(markdown.replace(/^\s*```mermaid[\s\S]*?^\s*```\s*$/gm, ""));
}

export interface EntryProgress {
  viewed: number;
  total: number;
  comments: number;
}

export function progressOf(
  paths: readonly string[],
  reviewFiles: Record<string, FileReviewState>,
): EntryProgress {
  let viewed = 0;
  let comments = 0;
  for (const path of paths) {
    const file = reviewFiles[path];
    if (file?.viewed) viewed++;
    comments += file?.comments.length ?? 0;
  }
  return { viewed, total: paths.length, comments };
}
