// Bun HTTP server: serves the frontend and exposes the API

import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import type {
  DiffResponse,
  DisplaySettings,
  LaunchSource,
  ReviewState,
  SessionResponse,
  SettingsResponse,
} from "../shared/types";
import {
  DISPLAY_SETTINGS_VALIDATORS,
  FOLDER_FILE_MAX_MB,
  isDisplaySettingsKey,
} from "../shared/types";
import { patchSettings, readSettings } from "./config";
import { listFolder, readFolderFile, resolveFolderImage } from "./folder";
import { getCheckout, getCurrentBranch, getGitDiff, getRepoRoot } from "./git";
import { deserializeReview } from "./xml-deserializer";
import { serializeReview } from "./xml-serializer";

interface ServerOptions {
  port: number;
  cwd: string;
  outputFile: string;
  loadExisting: boolean;
  source: LaunchSource;
  extraArgs: string[];
  devMode: boolean;
  themeOverride?: "light" | "dark";
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Resolve the directory where built web assets live. */
function getWebDistDir(): string {
  // When running from dist/cli/index.js, web assets are at dist/web/
  // Check for index.html to distinguish built output from source directory
  const fromDist = resolve(import.meta.dir, "../web");
  if (existsSync(join(fromDist, "index.html")) && existsSync(join(fromDist, "assets"))) {
    return fromDist;
  }

  // When running from source (src/cli/index.ts), built output is at dist/web/
  const fromRoot = resolve(import.meta.dir, "../../dist/web");
  if (existsSync(join(fromRoot, "index.html"))) return fromRoot;

  return fromDist; // Fallback
}

async function handleApiRequest(req: Request, url: URL, opts: ServerOptions): Promise<Response> {
  const pathname = url.pathname;

  // GET /api/session — the launch mode, which decides what the UI fetches next
  if (pathname === "/api/session" && req.method === "GET") {
    const body: SessionResponse = { source: opts.source };
    return jsonResponse(body);
  }

  // GET /api/diff[?staged=true] — the raw patch + metadata (branch/pending only)
  if (pathname === "/api/diff" && req.method === "GET") {
    const launch = opts.source;
    if (launch.type === "folder") {
      return jsonResponse({ error: "No diff in folder mode" }, 400);
    }
    const source =
      launch.type === "pending"
        ? { type: "pending" as const, staged: url.searchParams.get("staged") === "true" }
        : { type: "branch" as const, base: launch.base };
    try {
      const [patch, branch, checkout, repoRoot] = await Promise.all([
        getGitDiff(source, opts.extraArgs, opts.cwd),
        getCurrentBranch(opts.cwd),
        getCheckout(opts.cwd),
        getRepoRoot(opts.cwd),
      ]);

      const response: DiffResponse = {
        patch,
        source: { ...source, head: checkout.branch, commit: checkout.commit },
        info: { branch, repoRoot },
      };
      return jsonResponse(response);
    } catch (err) {
      return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
    }
  }

  // GET /api/folder/tree — every reviewable file under the folder root
  if (pathname === "/api/folder/tree" && req.method === "GET") {
    if (opts.source.type !== "folder") {
      return jsonResponse({ error: "Not in folder mode" }, 400);
    }
    try {
      return jsonResponse(await listFolder(opts.source.path));
    } catch (err) {
      return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
    }
  }

  // GET /api/folder/file?path=<relative> — raw content of one file
  if (pathname === "/api/folder/file" && req.method === "GET") {
    if (opts.source.type !== "folder") {
      return jsonResponse({ error: "Not in folder mode" }, 400);
    }
    const result = await readFolderFile(opts.source.path, url.searchParams.get("path") ?? "");
    if ("content" in result) {
      return new Response(result.content, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    switch (result.error) {
      case "too-large":
        return jsonResponse(
          { error: `File exceeds the ${FOLDER_FILE_MAX_MB} MB preview limit` },
          413,
        );
      case "binary":
        return jsonResponse({ error: "Binary file" }, 415);
      default:
        // Traversal answers like a missing file: nothing outside the root exists.
        return jsonResponse({ error: "File not found" }, 404);
    }
  }

  // GET /api/folder/image?path=<relative> — an image a markdown preview embeds
  if (pathname === "/api/folder/image" && req.method === "GET") {
    if (opts.source.type !== "folder") {
      return jsonResponse({ error: "Not in folder mode" }, 400);
    }
    const result = await resolveFolderImage(opts.source.path, url.searchParams.get("path") ?? "");
    if ("error" in result) {
      return jsonResponse({ error: "Image not found" }, result.error === "too-large" ? 413 : 404);
    }
    return new Response(Bun.file(result.path), {
      headers: {
        "Content-Type": result.type,
        // An SVG opened directly is a document: keep its scripts from running
        // on the app's origin.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      },
    });
  }

  // GET /api/review — load existing review from XML file (null if --existing not set or file absent)
  if (pathname === "/api/review" && req.method === "GET") {
    if (!opts.loadExisting) {
      return jsonResponse(null);
    }
    try {
      const outputPath = resolve(opts.cwd, opts.outputFile);
      const xml = await Bun.file(outputPath).text();
      return jsonResponse(deserializeReview(xml));
    } catch {
      return jsonResponse(null);
    }
  }

  // POST /api/review — save review to XML file
  if (pathname === "/api/review" && req.method === "POST") {
    try {
      const state = (await req.json()) as ReviewState;
      // Record the revision reviewed, so the skill can check the branch before
      // reopening or applying. Imported sources keep the forge's values.
      if (state.source.type !== "folder" && !state.source.head) {
        const { branch, commit } = await getCheckout(opts.cwd);
        Object.assign(state.source, { head: branch, commit });
      }
      const xml = serializeReview(state);
      const outputPath = resolve(opts.cwd, opts.outputFile);
      await Bun.write(outputPath, xml);
      return jsonResponse({ ok: true, path: outputPath });
    } catch (err) {
      return jsonResponse(
        { error: err instanceof Error ? err.message : "Failed to save review" },
        500,
      );
    }
  }

  // GET /api/settings: stored display settings merged over the defaults.
  // `--theme` rides alongside them so the stored preference survives underneath.
  if (pathname === "/api/settings" && req.method === "GET") {
    const body: SettingsResponse = { settings: await readSettings() };
    if (opts.themeOverride) body.sessionTheme = opts.themeOverride;
    return jsonResponse(body);
  }

  // PATCH /api/settings: per-key rather than a whole-object PUT, so two
  // instances editing different settings don't clobber each other.
  if (pathname === "/api/settings" && req.method === "PATCH") {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }

    // Validate the whole payload first, so one bad key is never half-applied.
    const patch: Partial<DisplaySettings> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!isDisplaySettingsKey(key)) {
        return jsonResponse({ error: `Unknown setting: ${key}` }, 400);
      }
      if (!DISPLAY_SETTINGS_VALIDATORS[key](value as never)) {
        return jsonResponse({ error: `Invalid value for ${key}` }, 400);
      }
      (patch as Record<string, unknown>)[key] = value;
    }

    return jsonResponse(await patchSettings(patch));
  }

  return jsonResponse({ error: "Not found" }, 404);
}

function getMimeType(path: string): string {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".ico")) return "image/x-icon";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".woff")) return "font/woff";
  return "application/octet-stream";
}

export function startServer(opts: ServerOptions): number {
  const webDistDir = getWebDistDir();

  const server = Bun.serve({
    port: opts.port,
    hostname: "0.0.0.0",

    async fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // API routes
      if (pathname.startsWith("/api/")) {
        return handleApiRequest(req, url, opts);
      }

      // In dev mode, proxy to Vite dev server
      if (opts.devMode) {
        try {
          const viteUrl = `http://localhost:5173${pathname}`;
          const viteResp = await fetch(viteUrl, {
            method: req.method,
            headers: req.headers,
            body: req.method !== "GET" ? req.body : undefined,
          });
          return new Response(viteResp.body, {
            status: viteResp.status,
            headers: viteResp.headers,
          });
        } catch {
          // Vite not running, fall through to static files
        }
      }

      // Serve static files from the web dist
      let filePath = join(webDistDir, pathname === "/" ? "index.html" : pathname);

      if (existsSync(filePath)) {
        const file = Bun.file(filePath);
        return new Response(file, {
          headers: { "Content-Type": getMimeType(filePath) },
        });
      }

      // Missing asset requests must 404 - serving index.html here yields a blank
      // page (the browser parses HTML as JS/CSS) when a cached index references
      // stale asset hashes.
      if (extname(pathname) !== "") {
        return new Response("Not Found", { status: 404 });
      }

      // SPA fallback: serve index.html for any non-file path
      filePath = join(webDistDir, "index.html");
      if (existsSync(filePath)) {
        const file = Bun.file(filePath);
        return new Response(file, {
          headers: { "Content-Type": "text/html" },
        });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  const port = server.port ?? opts.port;
  console.error(`local-review server running at http://localhost:${port}`);
  return port;
}
