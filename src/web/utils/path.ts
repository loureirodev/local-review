/** A path as its file name and the folder holding it ("" at the root). */
export function splitPath(path: string): { name: string; dir: string } {
  const slash = path.lastIndexOf("/");
  return slash === -1
    ? { name: path, dir: "" }
    : { name: path.slice(slash + 1), dir: path.slice(0, slash) };
}
