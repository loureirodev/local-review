// Rendered by MarkdownRenderer for ```mermaid blocks. `mermaid` is imported on
// the first block, so reviews without diagrams never download it.

import type { Mermaid, MermaidConfig } from "mermaid";
import { useState } from "react";
import { useMountEffect } from "../../hooks/useMountEffect";
import { useTheme } from "../../hooks/useTheme";

let mermaidPromise: Promise<Mermaid> | null = null;
/** `initialize` is global: renders run one at a time so each gets its theme. */
let renderQueue: Promise<unknown> = Promise.resolve();
let renderCount = 0;
let blockCount = 0;
/** The theme `initialize` last ran with: the palette depends on nothing else. */
let initializedDark: boolean | null = null;
/** Renders by theme and source, so a remounted block (a walkthrough step
 *  revisited, a comment scrolled back in) shows its diagram at once. */
const renders = new Map<string, Promise<Rendered>>();
const rendered = new Map<string, Rendered>();

/** An SVG and the id its elements, markers and scoped styles are named by. */
interface Rendered {
  svg: string;
  id: string;
}

/** The cached SVG under a block's own id: two blocks showing one diagram must
 *  not share marker ids, or a hidden copy's markers serve the visible one. */
function withId({ svg, id }: Rendered, blockId: string): string {
  return svg.replace(new RegExp(`${id}(?!\\d)`, "g"), blockId);
}

function loadMermaid(): Promise<Mermaid> {
  // A failed import (a chunk gone after a rebuild, a dropped connection) is
  // retried by the next render, not cached.
  mermaidPromise ??= import("mermaid").then(
    (m) => m.default,
    (err) => {
      mermaidPromise = null;
      throw err;
    },
  );
  return mermaidPromise;
}

/** Mermaid derives shades with a parser that only reads hex/rgb/hsl, and the
 *  role tokens are OKLCH: the canvas converts them. */
function toRgb(ctx: CanvasRenderingContext2D, color: string): string {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

/** Read when the render runs, after the commit has set `data-theme`. */
function themeConfig(dark: boolean): MermaidConfig {
  const style = getComputedStyle(document.documentElement);
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const role = (name: string) => {
    const value = style.getPropertyValue(`--color-${name}`).trim();
    return ctx ? toRgb(ctx, value) : value;
  };
  const [bg, panel, track, hair, text, muted, faint, accent, accentTint] = [
    "bg",
    "panel",
    "track",
    "hair",
    "text",
    "muted",
    "faint",
    "accent",
    "accent-tint",
  ].map(role);
  return {
    startOnLoad: false,
    securityLevel: "strict",
    // A failed diagram falls back to its source here, not to mermaid's
    // "Syntax error" graphic.
    suppressErrorRendering: true,
    theme: "base",
    // The default `neo` look draws drop shadows, outside DESIGN.md's set.
    look: "classic",
    fontFamily: style.getPropertyValue("--font-body").trim(),
    themeVariables: {
      darkMode: dark,
      background: bg,
      fontSize: "13px",
      primaryColor: panel,
      primaryTextColor: text,
      primaryBorderColor: faint,
      secondaryColor: accentTint,
      secondaryTextColor: text,
      secondaryBorderColor: accent,
      tertiaryColor: track,
      tertiaryTextColor: text,
      tertiaryBorderColor: hair,
      lineColor: muted,
      textColor: text,
      mainBkg: panel,
      nodeBorder: faint,
      clusterBkg: bg,
      clusterBorder: hair,
      edgeLabelBackground: bg,
      titleColor: text,
      noteBkgColor: accentTint,
      noteTextColor: text,
      noteBorderColor: accent,
      actorBkg: panel,
      actorBorder: faint,
      actorTextColor: text,
      actorLineColor: muted,
      signalColor: muted,
      signalTextColor: text,
      labelBoxBkgColor: panel,
      labelBoxBorderColor: faint,
      labelTextColor: text,
      loopTextColor: text,
      activationBkgColor: accentTint,
      activationBorderColor: accent,
    },
  };
}

const cacheKey = (source: string, dark: boolean) => `${dark}\n${source}`;

function renderDiagram(source: string, dark: boolean): Promise<Rendered> {
  const key = cacheKey(source, dark);
  const cached = renders.get(key);
  if (cached) return cached;
  const run = renderQueue.then(async () => {
    const mermaid = await loadMermaid();
    if (initializedDark !== dark) {
      mermaid.initialize(themeConfig(dark));
      initializedDark = dark;
    }
    const id = `mermaid-${++renderCount}`;
    try {
      const { svg } = await mermaid.render(id, source);
      const result = { svg, id };
      rendered.set(key, result);
      return result;
    } finally {
      // `render` works in a scratch node appended to <body> and leaves it
      // there when parsing fails, which lengthens the page.
      document.getElementById(`d${id}`)?.remove();
    }
  });
  renderQueue = run.catch(() => undefined);
  renders.set(key, run);
  // A failure is not cached: a later mount retries it.
  run.catch(() => renders.delete(key));
  return run;
}

type DiagramState = { status: "loading" } | { status: "done"; svg: string } | { status: "error" };

/** Keyed on source and theme by MermaidBlock: a change is a fresh render. */
function Diagram({ source, dark }: { source: string; dark: boolean }) {
  const [blockId] = useState(() => `mermaid-block-${++blockCount}`);
  const [state, setState] = useState<DiagramState>(() => {
    const cached = rendered.get(cacheKey(source, dark));
    return cached === undefined
      ? { status: "loading" }
      : { status: "done", svg: withId(cached, blockId) };
  });

  useMountEffect(() => {
    if (state.status === "done") return;
    let cancelled = false;
    renderDiagram(source, dark).then(
      (result) => !cancelled && setState({ status: "done", svg: withId(result, blockId) }),
      () => !cancelled && setState({ status: "error" }),
    );
    return () => {
      cancelled = true;
    };
  });

  if (state.status === "done") {
    return (
      <span
        className="md-mermaid"
        // Only mermaid's own output, sanitized under `securityLevel: "strict"`.
        // biome-ignore lint/security/noDangerouslySetInnerHtml: see above
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
    );
  }
  return (
    <>
      {state.status === "error" && (
        <span className="md-mermaid-error">Diagram could not be rendered</span>
      )}
      <code className="language-mermaid">{source}</code>
    </>
  );
}

/** Lives inside the `<pre>` the markdown already renders; CSS drops the code
 *  block's frame once the diagram is in. */
export default function MermaidBlock({ source }: { source: string }) {
  const { theme } = useTheme();
  return <Diagram key={`${theme}\n${source}`} source={source} dark={theme === "dark"} />;
}
