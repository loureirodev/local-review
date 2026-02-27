// Bun HTTP server: serves the frontend and exposes the API

import { join, resolve } from "path";
import { existsSync } from "fs";
import type { DiffMode, DiffResponse, ReviewState } from "../shared/types.js";
import {
  getGitDiff,
  getCurrentBranch,
  getBaseBranch,
  getRepoRoot,
} from "./git.js";
import { serializeReview } from "./xml-serializer.js";

interface ServerOptions {
  port: number;
  cwd: string;
  outputFile: string;
  initialMode: DiffMode;
  extraArgs: string[];
  devMode: boolean;
}

let currentMode: DiffMode = "unstaged";

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

async function handleApiRequest(
  req: Request,
  pathname: string,
  opts: ServerOptions
): Promise<Response> {
  // GET /api/diff — return the raw patch + metadata
  if (pathname === "/api/diff" && req.method === "GET") {
    try {
      const [patch, branch, baseBranch, repoRoot] = await Promise.all([
        getGitDiff(currentMode, opts.extraArgs, opts.cwd),
        getCurrentBranch(opts.cwd),
        getBaseBranch(opts.cwd),
        getRepoRoot(opts.cwd),
      ]);

      const response: DiffResponse = {
        patch,
        source: { type: "local", mode: currentMode, args: opts.extraArgs },
        info: { branch, baseBranch, repoRoot },
      };
      return jsonResponse(response);
    } catch (err) {
      return jsonResponse(
        { error: err instanceof Error ? err.message : "Unknown error" },
        500
      );
    }
  }

  // POST /api/diff/mode — change the diff mode
  if (pathname === "/api/diff/mode" && req.method === "POST") {
    try {
      const body = (await req.json()) as { mode: DiffMode };
      if (!["unstaged", "staged", "branch"].includes(body.mode)) {
        return jsonResponse({ error: "Invalid mode" }, 400);
      }
      currentMode = body.mode;
      return jsonResponse({ ok: true, mode: currentMode });
    } catch {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }
  }

  // POST /api/review — save review to XML file
  if (pathname === "/api/review" && req.method === "POST") {
    try {
      const state = (await req.json()) as ReviewState;
      const xml = serializeReview(state);
      const outputPath = resolve(opts.cwd, opts.outputFile);
      await Bun.write(outputPath, xml);
      return jsonResponse({ ok: true, path: outputPath });
    } catch (err) {
      return jsonResponse(
        { error: err instanceof Error ? err.message : "Failed to save review" },
        500
      );
    }
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
  currentMode = opts.initialMode;
  const webDistDir = getWebDistDir();

  const server = Bun.serve({
    port: opts.port,
    hostname: "0.0.0.0",

    async fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // API routes
      if (pathname.startsWith("/api/")) {
        return handleApiRequest(req, pathname, opts);
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
