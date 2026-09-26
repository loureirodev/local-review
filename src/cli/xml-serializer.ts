// XML serializer: ReviewState → XML with custom schema

import type { DiffSource, ReviewComment, ReviewState } from "../shared/types";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function indent(level: number): string {
  return "  ".repeat(level);
}

function serializeComment(comment: ReviewComment, level: number): string {
  const lines: string[] = [];
  const editedAttr = comment.edited ? ' edited="true"' : "";
  lines.push(`${indent(level)}<comment id="${escapeXml(comment.id)}"${editedAttr}>`);
  lines.push(`${indent(level + 1)}<file>${escapeXml(comment.filePath)}</file>`);
  if (comment.line !== null) {
    // No side: a raw file line (folder mode).
    const sideAttr = comment.side ? ` side="${comment.side}"` : "";
    lines.push(`${indent(level + 1)}<line number="${comment.line}"${sideAttr} />`);
  }
  lines.push(`${indent(level + 1)}<body>${escapeXml(comment.body)}</body>`);
  lines.push(`${indent(level + 1)}<created-at>${escapeXml(comment.createdAt)}</created-at>`);
  if (comment.url) {
    lines.push(`${indent(level + 1)}<url>${escapeXml(comment.url)}</url>`);
  }
  lines.push(`${indent(level)}</comment>`);
  return lines.join("\n");
}

function serializeSourceAttrs(source: DiffSource): string {
  // Insertion order is attribute order; undefined values are dropped.
  const attrs: Record<string, string | number | boolean | undefined> = { type: source.type };
  switch (source.type) {
    case "branch":
      attrs.base = source.base;
      break;
    case "pending":
      attrs.staged = source.staged;
      break;
    case "folder":
      attrs.path = source.path;
      break;
    case "github-pr":
      Object.assign(attrs, {
        owner: source.owner,
        repo: source.repo,
        pr: source.pr,
        base: source.base,
      });
      break;
    case "gitlab-mr":
      Object.assign(attrs, { project: source.project, mr: source.mr, base: source.base });
      break;
    case "agent":
      attrs.agent = source.agent;
      break;
  }
  if (source.type !== "folder") {
    attrs.head = source.head;
    attrs.commit = source.commit;
  }
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}="${escapeXml(String(value))}"`)
    .join(" ");
}

export function serializeReview(state: ReviewState): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push("<review>");
  lines.push(`${indent(1)}<timestamp>${escapeXml(state.timestamp)}</timestamp>`);

  lines.push(`${indent(1)}<source ${serializeSourceAttrs(state.source)} />`);

  // Files
  lines.push(`${indent(1)}<files>`);
  for (const file of state.files) {
    lines.push(`${indent(2)}<file path="${escapeXml(file.path)}" viewed="${file.viewed}">`);
    for (const comment of file.comments) {
      lines.push(serializeComment(comment, 3));
    }
    lines.push(`${indent(2)}</file>`);
  }
  lines.push(`${indent(1)}</files>`);

  lines.push("</review>");
  return `${lines.join("\n")}\n`;
}
