import type { FileReviewState, LaunchSource } from "@shared/types";

const SEPARATOR = " · ";

/** Tab title, most specific part first: tabs truncate from the right. A
 *  leading dot marks comments not yet exported, as editors mark unsaved files. */
export function pageTitle(
  launch: LaunchSource,
  repo: string | undefined,
  branch: string,
  unsaved: boolean,
): string {
  const prefix = unsaved ? "• " : "";
  if (launch.type === "folder") {
    const folder = launch.path.split(/[\\/]/).filter(Boolean).at(-1) ?? launch.path;
    return prefix + (repo && repo !== folder ? `${folder}${SEPARATOR}${repo}` : folder);
  }
  const head = launch.type === "branch" ? `${branch} → ${launch.base}` : branch;
  return prefix + (repo ? `${head}${SEPARATOR}${repo}` : head);
}

/** Identifies the comments of a review, to tell whether they changed since
 *  the last export. Viewed marks are left out: ticking files off is not work
 *  worth flagging. */
export function commentsSignature(files: Iterable<FileReviewState>): string {
  const entries: string[] = [];
  for (const file of files) {
    for (const comment of file.comments) entries.push(`${comment.id}\0${comment.body}`);
  }
  return entries.sort().join("\n");
}
