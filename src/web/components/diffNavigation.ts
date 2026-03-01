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

export interface VisibleFileCandidate {
  filePath: string;
  isIntersecting: boolean;
  top: number;
}

export function pickActiveFile(candidates: VisibleFileCandidate[]): string | null {
  const visible = candidates.filter((candidate) => candidate.isIntersecting);
  if (visible.length === 0) return null;

  visible.sort((a, b) => {
    const aDistance = Math.abs(a.top);
    const bDistance = Math.abs(b.top);
    if (aDistance === bDistance) {
      return a.top - b.top;
    }

    return aDistance - bDistance;
  });

  return visible[0]?.filePath ?? null;
}
