// XML deserializer: XML → ReviewState (inverse of xml-serializer.ts)

import type { DiffSource, FileReviewState, ReviewComment, ReviewState } from "../shared/types";

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function getTagContent(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? unescapeXml(match[1].trim()) : null;
}

function getAttr(tag: string, attr: string): string | null {
  // Anchored on whitespace so `base` can't match inside another attribute name.
  const match = tag.match(new RegExp(`(?:^|\\s)${attr}="([^"]*)"`));
  return match ? unescapeXml(match[1]) : null;
}

function parseComment(commentXml: string): ReviewComment {
  const id = getAttr(commentXml, "id") ?? "";
  const filePath = getTagContent(commentXml, "file") ?? "";
  const body = getTagContent(commentXml, "body") ?? "";
  const createdAt = getTagContent(commentXml, "created-at") ?? "";

  const lineMatch = commentXml.match(/<line number="(\d+)"(?: side="(addition|deletion)")?\s*\/>/);
  const line = lineMatch ? parseInt(lineMatch[1], 10) : null;
  const side = (lineMatch?.[2] as "addition" | "deletion" | undefined) ?? null;

  const url = getTagContent(commentXml, "url") ?? undefined;
  const edited = getAttr(commentXml, "edited") === "true" ? true : undefined;

  return { id, filePath, line, side, body, createdAt, url, edited };
}

function parseSource(xml: string): DiffSource {
  const sourceMatch = xml.match(/<source ([^>]*?)\s*\/>/);
  if (!sourceMatch) return { type: "pending", staged: false };

  const tag = sourceMatch[1];
  const optional = (attr: string) => getAttr(tag, attr) ?? undefined;
  const ref = { head: optional("head"), commit: optional("commit") };

  switch (getAttr(tag, "type")) {
    case "branch":
      return { type: "branch", base: getAttr(tag, "base") ?? "", ...ref };
    case "folder":
      return { type: "folder", path: getAttr(tag, "path") ?? "" };
    case "github-pr":
      return {
        type: "github-pr",
        owner: getAttr(tag, "owner") ?? "",
        repo: getAttr(tag, "repo") ?? "",
        pr: parseInt(getAttr(tag, "pr") ?? "0", 10),
        base: optional("base"),
        ...ref,
      };
    case "gitlab-mr":
      return {
        type: "gitlab-mr",
        project: getAttr(tag, "project") ?? "",
        mr: parseInt(getAttr(tag, "mr") ?? "0", 10),
        base: optional("base"),
        ...ref,
      };
    case "agent":
      return { type: "agent", agent: optional("agent"), ...ref };
    default:
      return { type: "pending", staged: getAttr(tag, "staged") === "true", ...ref };
  }
}

/** Written before 0.4 (`<source type="local" mode="...">`). Still parsed — as
 *  pending changes — but its mode and revision are lost. */
export function isLegacyReview(xml: string): boolean {
  return /<source\s[^>]*type="local"/.test(xml);
}

export function deserializeReview(xml: string): ReviewState {
  const timestamp = getTagContent(xml, "timestamp") ?? new Date().toISOString();
  const source = parseSource(xml);

  const files: FileReviewState[] = [];
  // Match <file> blocks — use greedy [\s\S]* with </file> followed by
  // whitespace+<file or whitespace+</files to find the correct closing tag,
  // avoiding premature match on child <file> elements inside <comment>.
  for (const fileMatch of xml.matchAll(
    /<file path="([^"]*)" viewed="([^"]*)">([\s\S]*?)<\/file>(?=\s*<(?:file |\/files))/g,
  )) {
    const path = unescapeXml(fileMatch[1]);
    const viewed = fileMatch[2] === "true";
    const fileBody = fileMatch[3];

    const comments: ReviewComment[] = [];
    for (const commentMatch of fileBody.matchAll(/<comment[\s\S]*?<\/comment>/g)) {
      comments.push(parseComment(commentMatch[0]));
    }

    files.push({ path, viewed, comments });
  }

  return { timestamp, source, files };
}
