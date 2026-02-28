# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**local-review** is a local web-based git diff review tool. A Bun CLI server serves a React 19 frontend that displays diffs with syntax highlighting, line-level comments, file progress tracking, and XML export.

## Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start dev mode (Vite on :5173, CLI server on :3000 with `--dev` flag) |
| `bun run build` | Build frontend (Vite → dist/web/) + CLI (bun build → dist/cli/) |
| `bun run preview` | Run the built production binary |
| `bun run typecheck` | TypeScript type checking (no emit) |
| `bun run lint` | Biome linter |
| `bun run lint:fix` | Auto-fix lint issues |
| `bun run format` | Biome formatter |

## Architecture

**Backend** (`src/cli/`): Bun-based CLI and HTTP server.
- `index.ts` — CLI entry point, parses args (--port, --mode, --dev, --no-open, --output-file, -- git-args)
- `server.ts` — HTTP server with API routes (`GET /api/diff`, `POST /api/diff/mode`, `POST /api/review`) + static file serving from `dist/web/`
- `git.ts` — Git operations (diff generation, branch detection, repo validation)
- `xml-serializer.ts` — Serializes review state to XML for export

**Frontend** (`src/web/`): React 19 + Vite + Tailwind CSS v4.
- `App.tsx` — Main orchestrator: fetches diff, parses files, manages selection
- `context/ReviewContext.tsx` — Review state via `useReducer` (files, comments, viewed status)
- `hooks/useApi.ts` — API fetch wrappers
- `hooks/useSettings.ts` — Display settings persisted to localStorage
- `components/DiffViewer.tsx` — Renders diffs using `@pierre/diffs` FileDiff component with comment overlays
- `components/FileTree.tsx` — Sidebar with search, nested/flat tree, progress tracking
- `components/Toolbar.tsx` — Mode switcher (unstaged/staged/branch), settings, export

**Shared** (`src/shared/types.ts`): TypeScript types used by both CLI and frontend (DiffMode, ReviewComment, ReviewState, etc.).

## Key Patterns

- **Diff rendering** relies on `@pierre/diffs` (Shiki-based). DiffViewer injects hover buttons and comment overlays into the diff DOM.
- **Dev proxy**: In dev mode, Vite proxies `/api` requests to the CLI server on port 3000. The CLI `--dev` flag makes the server proxy non-API requests to Vite on port 5173.
- **Path alias**: `@shared` maps to `src/shared` (configured in both vite.config.ts and tsconfig.json).
- **Dark theme**: neutral-950 background, JetBrains Mono font.

## Code Style

Enforced by Biome: 2-space indent, double quotes, semicolons, 100-char line width.

## Commit Conventions

This project enforces **Conventional Commits** via `commitlint` and `husky` hooks.

### Rules

- Type must be lowercase
- Subject should not be capitalized and should not end with a period
- Subject should be imperative (e.g., "add feature" not "added feature")
- Body and footer must be separated from subject by a blank line
- Breaking changes should be noted in the footer with `BREAKING CHANGE:`
