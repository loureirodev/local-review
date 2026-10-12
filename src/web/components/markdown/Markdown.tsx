import { lazy, Suspense } from "react";

const MarkdownRenderer = lazy(() => import("./MarkdownRenderer"));

/** Markdown rendered as GFM. Until the renderer has loaded, the raw text shows
 *  as it always did, so nothing jumps for plain-text comments. */
export function Markdown({
  children,
  density = "compact",
}: {
  children: string;
  density?: "compact" | "normal";
}) {
  return (
    <Suspense
      fallback={
        <p
          className={`text-text whitespace-pre-wrap break-words ${
            density === "compact" ? "text-[13px] leading-relaxed" : "text-sm"
          }`}
        >
          {children}
        </p>
      }
    >
      <MarkdownRenderer density={density}>{children}</MarkdownRenderer>
    </Suspense>
  );
}
