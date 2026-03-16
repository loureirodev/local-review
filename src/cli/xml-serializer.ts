// XML serializer: ReviewState → XML with custom schema

import type { ReviewComment, ReviewState } from "../shared/types.js";

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
    lines.push(
      `${indent(level + 1)}<line number="${comment.line}" side="${comment.side ?? "addition"}" />`,
    );
  }
  lines.push(`${indent(level + 1)}<body>${escapeXml(comment.body)}</body>`);
  lines.push(`${indent(level + 1)}<created-at>${escapeXml(comment.createdAt)}</created-at>`);
  if (comment.url) {
    lines.push(`${indent(level + 1)}<url>${escapeXml(comment.url)}</url>`);
  }
  lines.push(`${indent(level)}</comment>`);
  return lines.join("\n");
}

export function serializeReview(state: ReviewState): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push("<review>");
  lines.push(`${indent(1)}<timestamp>${escapeXml(state.timestamp)}</timestamp>`);

  // Source info
  if (state.source.type === "local") {
    lines.push(`${indent(1)}<source type="local" mode="${state.source.mode}" />`);
  } else if (state.source.type === "github-pr") {
    lines.push(
      `${indent(1)}<source type="github-pr" owner="${escapeXml(state.source.owner)}" repo="${escapeXml(state.source.repo)}" pr="${state.source.pr}" />`,
    );
  } else if (state.source.type === "gitlab-mr") {
    lines.push(
      `${indent(1)}<source type="gitlab-mr" project="${escapeXml(state.source.project)}" mr="${state.source.mr}" />`,
    );
  } else if (state.source.type === "agent") {
    const agentAttr = state.source.agent ? ` agent="${escapeXml(state.source.agent)}"` : "";
    lines.push(`${indent(1)}<source type="agent"${agentAttr} />`);
  }

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
