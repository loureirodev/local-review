import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CODE,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  type Transformer,
  UNORDERED_LIST,
} from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import type { EditorThemeClasses, Klass, LexicalNode } from "lexical";

/** The GFM subset a comment is written in. Lexical's default set also carries
 *  `==highlight==`, which GFM doesn't render, so it is left out. */
export const TRANSFORMERS: Transformer[] = [
  HEADING,
  QUOTE,
  UNORDERED_LIST,
  ORDERED_LIST,
  CODE,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  STRIKETHROUGH,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
];

export const NODES: Klass<LexicalNode>[] = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  CodeNode,
];

/** The editor renders `react-markdown`'s tags inside `.md-body`, so the same
 *  rules style it; these classes cover where Lexical's DOM differs. */
export const THEME: EditorThemeClasses = {
  text: { strikethrough: "md-strike" },
  code: "md-code-block",
  list: { nested: { listitem: "md-li-nested" } },
};

/** Paragraphs split on blank lines and adjacent lines merge, as in CommonMark,
 *  so the editor shows the same blocks the rendered comment does. */
export const PRESERVE_NEW_LINES = false;
export const MERGE_ADJACENT_LINES = true;

export function isUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" || protocol === "mailto:";
  } catch {
    return false;
  }
}
