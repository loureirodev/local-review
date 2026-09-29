/** A markdown comment body as one line of plain text, for list excerpts where
 *  the renderer is too heavy. Covers what comments use; not a parser. */
export function markdownToPlainText(markdown: string): string {
  return (
    markdown
      // Fenced code: keep the code, drop the fences and info string.
      .replace(/^\s*(```|~~~)[^\n]*$/gm, "")
      // Images carry no text worth showing.
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      // Links and reference links keep their text.
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
      // Block markers at the start of a line.
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s{0,3}>\s?/gm, "")
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/gm, "")
      // Inline code keeps its text.
      .replace(/`([^`]*)`/g, "$1")
      // Emphasis and strikethrough.
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      // Underscores only at word edges: `snake_case` is not emphasis.
      .replace(/(^|\W)(__?)(?=\S)(.+?)\2(?=\W|$)/g, "$1$3")
      .replace(/~~(.+?)~~/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
  );
}
