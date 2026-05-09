export function getFileSectionId(filePath: string): string {
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    hash = (hash * 31 + filePath.charCodeAt(i)) | 0;
  }

  const normalized = filePath
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = Math.abs(hash).toString(36);
  return `diff-file-${normalized || "file"}-${suffix}`;
}
