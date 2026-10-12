// Loaded on demand through `Markdown` or the preview, so react-markdown and its
// unified pipeline stay out of the initial bundle.

import { type AnchorHTMLAttributes, type HTMLAttributes, memo } from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidBlock from "./MermaidBlock";

const REMARK_PLUGINS = [remarkGfm];

/** Links leave the review in a new tab rather than navigating the app away. */
function ExternalLink({
  node: _node,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) {
  return <a {...props} target="_blank" rel="noopener noreferrer" />;
}

/** ```mermaid blocks render as diagrams; every other code renders as before. */
function Code({
  node: _node,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { node?: unknown }) {
  if (className?.split(" ").includes("language-mermaid") && typeof children === "string") {
    return <MermaidBlock source={children.replace(/\n$/, "")} />;
  }
  return (
    <code {...props} className={className}>
      {children}
    </code>
  );
}

const BASE_COMPONENTS: Components = { a: ExternalLink, code: Code };

export interface MarkdownRendererProps {
  children: string;
  density: "compact" | "normal";
  components?: Components;
  rehypePlugins?: Options["rehypePlugins"];
}

/** Memoized: a comment re-renders with its list, but its body only re-parses
 *  when the text changes. */
export default memo(function MarkdownRenderer({
  children,
  density,
  components,
  rehypePlugins,
}: MarkdownRendererProps) {
  return (
    <div className={`md-body md-body--${density}`}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={rehypePlugins}
        components={components ? { ...BASE_COMPONENTS, ...components } : BASE_COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});
