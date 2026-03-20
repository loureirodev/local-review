# Agent Instructions

## Package Manager
Use **bun**: `bun install`, `bun run dev`, `bun run build`

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: <agent name> <noreply@example.com>
```

## Commit Conventions
Conventional Commits enforced via `commitlint` + `husky`. Lowercase type, imperative subject, no trailing period.

## File-Scoped Commands
| Task | Command |
|------|---------|
| Typecheck | `bun run typecheck` |
| Lint file | `bunx @biomejs/biome check path/to/file.ts` |
| Fix file | `bun run lint:fix-files path/to/file.ts` |
| Lint all | `bun run lint` |
| Build | `bun run build` |

## Architecture
- **CLI/Server** — `src/cli/` (Bun HTTP server, git ops, XML serialization)
- **Frontend** — `src/web/` (React 19 + Vite + Tailwind v4)
- **Shared types** — `src/shared/types.ts` (used by both CLI and web)
- **Path alias** — `@shared` → `src/shared` (in `vite.config.ts` and `tsconfig.json`)
- **Diff rendering** — `@pierre/diffs` (Shiki-based)

## Dev Proxy
- Vite (`:5173`) proxies `/api` → CLI server (`:3000`)
- CLI `--dev` proxies non-API → Vite (`:5173`)

## Key Conventions
- Code style enforced by Biome — see `biome.json`
- See `CONTRIBUTING.md` for setup, project structure, and workflow
