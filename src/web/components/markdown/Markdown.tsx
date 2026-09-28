import { lazy, Suspense } from "react";

const MarkdownRenderer = lazy(() => import("./MarkdownRenderer"));

/** A comment body rendered as GFM. Until the renderer has loaded, the raw text
 *  shows as it always did, so nothing jumps for plain-text comments. */
export function Markdown({ children }: { children: string }) {
  return (
    <Suspense
      fallback={
        <p className="text-[13px] text-text whitespace-pre-wrap break-words leading-relaxed">
          {children}
        </p>
      }
    >
      <MarkdownRenderer density="compact">{children}</MarkdownRenderer>
    </Suspense>
  );
}
