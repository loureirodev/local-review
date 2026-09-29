// Loaded on demand, the first time a folder's markdown file renders.

import type { DiffSource, ReviewComment } from "@shared/types";
import type { Element, ElementContent, Root, RootContent } from "hast";
import { type ComponentPropsWithoutRef, createElement, memo, type ReactNode, useMemo } from "react";
import type { Components } from "react-markdown";
import { folderImageSrc } from "../../utils/folderImage";
import CommentDisplay from "../CommentDisplay";
import { AddCommentButton } from "../diff/HeaderControls";
import MarkdownRenderer from "./MarkdownRenderer";

export interface MarkdownPreviewProps {
  filePath: string;
  /** The whole file: a rendered line n is file line n. */
  content: string;
  /** The file's line comments, each shown under the block it sits in. */
  comments: ReviewComment[];
  source: DiffSource | null;
  onRequestComment: (filePath: string, line: number, side: null) => void;
  onDeleteComment: (filePath: string, commentId: string) => void;
  onUpdateComment: (filePath: string, commentId: string, body: string) => void;
}

/** Blocks a comment attaches to. Each is wrapped with its add button and its
 *  comments, so neither joins a heading's accessible name; a list item takes
 *  them as children instead, since a list can only hold items. */
const WRAPPED_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
  "blockquote",
  "table",
] as const;
const BLOCK_TAGS: ReadonlySet<string> = new Set([...WRAPPED_TAGS, "li"]);

interface Block {
  node: Element;
  start: number;
  end: number;
  depth: number;
}

/** The tree's blocks in document order, with how deeply each is nested. */
function collectBlocks(tree: Root): Block[] {
  const blocks: Block[] = [];
  const walk = (children: (RootContent | ElementContent)[], depth: number) => {
    for (const child of children) {
      if (child.type !== "element") continue;
      const position = child.position;
      const isBlock = BLOCK_TAGS.has(child.tagName) && position != null;
      if (isBlock) {
        blocks.push({ node: child, start: position.start.line, end: position.end.line, depth });
      }
      walk(child.children, isBlock ? depth + 1 : depth);
    }
  };
  walk(tree.children, 0);
  return blocks;
}

/** Each comment goes to the innermost block holding its line. One on a line
 *  no block covers (a blank line, past the end) goes to the last block that
 *  starts above it, or failing that the first. */
function assignComments(blocks: Block[], comments: ReviewComment[]) {
  const owners = new Map<Element, ReviewComment[]>();
  if (blocks.length === 0) return owners;
  for (const comment of comments) {
    const line = comment.line;
    if (line === null) continue;
    let owner: Block | undefined;
    for (const block of blocks) {
      if (block.start <= line && line <= block.end && (!owner || block.depth > owner.depth)) {
        owner = block;
      }
    }
    if (!owner) {
      for (const block of blocks) if (block.start <= line) owner = block;
    }
    owner ??= blocks[0] as Block;
    const list = owners.get(owner.node);
    if (list) list.push(comment);
    else owners.set(owner.node, [comment]);
  }
  for (const list of owners.values()) list.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
  return owners;
}

type BlockProps = ComponentPropsWithoutRef<"div"> & { node?: Element };

/** Memoized: CodeView re-renders visible annotations as items scroll, and each
 *  render would re-parse the whole file. */
export default memo(function MarkdownPreview({
  filePath,
  content,
  comments,
  source,
  onRequestComment,
  onDeleteComment,
  onUpdateComment,
}: MarkdownPreviewProps) {
  const { components, rehypePlugins } = useMemo(() => {
    // Filled by the rehype pass, which runs before the components render.
    let owners = new Map<Element, ReviewComment[]>();
    const rehypeAssignComments = () => (tree: Root) => {
      const blocks = collectBlocks(tree);
      owners = assignComments(blocks, comments);
      // With no block to sit under (an empty file, one only of rules or HTML),
      // the comments go in a holder after whatever renders, so none is lost.
      if (blocks.length === 0) {
        const lined = comments
          .filter((comment) => comment.line !== null)
          .sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
        if (lined.length > 0) {
          const holder: Element = { type: "element", tagName: "div", properties: {}, children: [] };
          tree.children.push(holder);
          owners.set(holder, lined);
        }
      }
    };

    // The same control as the gutter's, in the column's left margin, aligned
    // with the block's first line.
    const addButton = (line: number | undefined): ReactNode =>
      line == null ? null : (
        <span className="md-block-add">
          <AddCommentButton
            label={`Add comment on line ${line}`}
            onClick={() => onRequestComment(filePath, line, null)}
          />
        </span>
      );

    const blockComments = (node: Element | undefined): ReactNode => {
      const owned = node ? owners.get(node) : undefined;
      if (!owned) return null;
      return (
        <div className="md-block-comments">
          {owned.map((comment) => (
            <CommentDisplay
              key={comment.id}
              comment={comment}
              source={source}
              onDelete={(id) => onDeleteComment(comment.filePath, id)}
              onUpdate={(id, body) => onUpdateComment(comment.filePath, id, body)}
            />
          ))}
        </div>
      );
    };

    const block =
      (tag: string) =>
      ({ node, ...props }: BlockProps) => (
        <div className="md-block">
          {addButton(node?.position?.start.line)}
          {createElement(tag, props)}
          {blockComments(node)}
        </div>
      );

    const li = ({
      node,
      children,
      className,
      ...props
    }: ComponentPropsWithoutRef<"li"> & { node?: Element }) => (
      <li {...props} className={className ? `md-block ${className}` : "md-block"}>
        {addButton(node?.position?.start.line)}
        {children}
        {blockComments(node)}
      </li>
    );

    const div = ({ node, ...props }: BlockProps) =>
      node && owners.has(node) ? blockComments(node) : <div {...props} />;

    const img = ({
      node: _node,
      src,
      alt,
      ...props
    }: ComponentPropsWithoutRef<"img"> & { node?: Element }) => (
      <img
        {...props}
        alt={alt}
        src={typeof src === "string" ? folderImageSrc(filePath, src) : src}
      />
    );

    const result: Record<string, unknown> = { li, div, img };
    for (const tag of WRAPPED_TAGS) result[tag] = block(tag);
    return { components: result as Components, rehypePlugins: [rehypeAssignComments] };
  }, [filePath, comments, source, onRequestComment, onDeleteComment, onUpdateComment]);

  return (
    <div className="md-preview">
      {content.trim() ? null : (
        <div className="py-6 text-center text-[13px] text-muted">Nothing to preview</div>
      )}
      <MarkdownRenderer density="normal" components={components} rehypePlugins={rehypePlugins}>
        {content}
      </MarkdownRenderer>
    </div>
  );
});
