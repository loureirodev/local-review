const SCHEME = /^[a-z][a-z\d+.-]*:/i;

/**
 * Where a folder markdown file's image loads from. A relative `src` resolves
 * against the file's directory and a root-relative one against the folder
 * root, as on GitHub, both served by the CLI; anything with a scheme (or `//`)
 * is left as written.
 */
export function folderImageSrc(filePath: string, src: string): string {
  if (!src || SCHEME.test(src) || src.startsWith("//") || src.startsWith("#")) return src;
  const base = `http://root/${filePath.split("/").map(encodeURIComponent).join("/")}`;
  let path: string;
  try {
    path = decodeURIComponent(new URL(src, base).pathname.slice(1));
  } catch {
    return src;
  }
  return path ? `/api/folder/image?path=${encodeURIComponent(path)}` : src;
}
