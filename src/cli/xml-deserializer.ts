// XML deserializer: XML → ReviewState (inverse of xml-serializer.ts)

import type {
  DiffMode,
  DiffSource,
  FileReviewState,
  ReviewComment,
  ReviewState,
} from "../shared/types";

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
  const match = tag.match(new RegExp(`${attr}="([^"]*)"`));
  return match ? unescapeXml(match[1]) : null;
}

function parseComment(commentXml: string): ReviewComment {
  const id = getAttr(commentXml, "id") ?? "";
  const filePath = getTagContent(commentXml, "file") ?? "";
  const body = getTagContent(commentXml, "body") ?? "";
  const createdAt = getTagContent(commentXml, "created-at") ?? "";

  const lineMatch = commentXml.match(/<line number="(\d+)" side="([^"]*)"\s*\/>/);
  const line = lineMatch ? parseInt(lineMatch[1], 10) : null;
  const side = lineMatch ? (lineMatch[2] as "addition" | "deletion") : null;

  const url = getTagContent(commentXml, "url") ?? undefined;
  const edited = getAttr(commentXml, "edited") === "true" ? true : undefined;

  return { id, filePath, line, side, body, createdAt, url, edited };
}

function parseSource(xml: string): DiffSource {
  const sourceMatch = xml.match(/<source ([^>]*?)\s*\/>/);
  if (!sourceMatch) return { type: "local", mode: "unstaged" };

  const tag = sourceMatch[1];
  const type = getAttr(tag, "type") ?? "local";

  if (type === "github-pr") {
    return {
      type: "github-pr",
      owner: getAttr(tag, "owner") ?? "",
      repo: getAttr(tag, "repo") ?? "",
      pr: parseInt(getAttr(tag, "pr") ?? "0", 10),
    };
  }
  if (type === "gitlab-mr") {
    return {
      type: "gitlab-mr",
      project: getAttr(tag, "project") ?? "",
      mr: parseInt(getAttr(tag, "mr") ?? "0", 10),
    };
  }

  if (type === "agent") {
    return {
      type: "agent",
      agent: getAttr(tag, "agent") ?? undefined,
    };
  }

  return {
    type: "local",
    mode: (getAttr(tag, "mode") ?? "unstaged") as DiffMode,
  };
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
