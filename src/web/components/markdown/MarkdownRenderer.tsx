// Loaded on demand through `Markdown` or the preview, so react-markdown and its
// unified pipeline stay out of the initial bundle.

import { type AnchorHTMLAttributes, memo } from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";

const REMARK_PLUGINS = [remarkGfm];

/** Links leave the review in a new tab rather than navigating the app away. */
function ExternalLink({
  node: _node,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) {
  return <a {...props} target="_blank" rel="noopener noreferrer" />;
}

const BASE_COMPONENTS: Components = { a: ExternalLink };

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
