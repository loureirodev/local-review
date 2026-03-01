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
  const visible = candidates.filter((c) => c.isIntersecting);
  if (visible.length === 0) return null;

  // Sections with top <= 0 are actively being scrolled through.
  // Among these, the one with top closest to 0 is the most recently entered.
  const aboveTop = visible.filter((c) => c.top <= 0);
  if (aboveTop.length > 0) {
    return aboveTop.reduce((a, b) => (a.top >= b.top ? a : b)).filePath;
  }

  // Nothing scrolled into yet — pick the closest section about to enter.
  return visible.reduce((a, b) => (a.top <= b.top ? a : b)).filePath;
}
