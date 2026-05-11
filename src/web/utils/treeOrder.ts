export function compareByTreeOrder(a: string, b: string): number {
  const pa = a.split("/");
  const pb = b.split("/");
  const len = Math.min(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const lastA = i === pa.length - 1;
    const lastB = i === pb.length - 1;
    if (lastA !== lastB) return lastA ? 1 : -1;
    const cmp = pa[i].localeCompare(pb[i]);
    if (cmp !== 0) return cmp;
  }
  return pa.length - pb.length;
}
