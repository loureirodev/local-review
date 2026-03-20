# Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) runtime installed
- [Node.js](https://nodejs.org) 22+ (for publishing steps only)

### Getting Started

```bash
git clone https://github.com/danielloureiro/local-review.git
cd local-review
bun install
```

### Development Mode

```bash
bun run dev
```

This starts the CLI server with the `--dev` flag, which proxies non-API requests to Vite dev server on port 5173 for hot module reloading.

### Available Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start dev mode (Vite HMR + CLI server) |
| `bun run build` | Build frontend (Vite) + CLI (bun build) |
| `bun run preview` | Run the built production binary |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | Biome linter |
| `bun run lint:fix` | Auto-fix lint issues |
| `bun run format` | Biome formatter |

## Project Structure

```
local-review/
├── src/
│   ├── cli/                   # Bun backend
│   │   ├── index.ts           # CLI entry point (arg parsing)
│   │   ├── server.ts          # HTTP server + API routes
│   │   ├── git.ts             # Git operations
│   │   ├── open-browser.ts    # Cross-platform browser opener
│   │   └── xml-serializer.ts  # Review XML export
│   ├── web/                   # React frontend
│   │   ├── App.tsx            # Main app orchestrator
│   │   ├── components/        # UI components
│   │   ├── context/           # React context (review state)
│   │   ├── hooks/             # API functions, settings
│   │   └── styles/            # Tailwind CSS
│   └── shared/
│       └── types.ts           # TypeScript types shared between CLI and web
├── dist/                      # Build output
│   ├── cli/                   # Bundled CLI
│   └── web/                   # Built frontend
└── package.json
```

## Architecture

- **Single server process**: `Bun.serve()` handles both API routes and static file serving
- **Dev proxy**: In dev mode, the CLI server proxies non-API requests to Vite on port 5173. Vite proxies `/api` requests back to the CLI server on port 3000.
- **No Vite proxy in production**: Built frontend assets are served directly by Bun
- **API-first design**: Frontend communicates via REST API at `/api/*`
- **Shared types**: TypeScript types shared between CLI and web via `src/shared/types.ts`
- **Path alias**: `@shared` maps to `src/shared` (configured in both `vite.config.ts` and `tsconfig.json`)

## Code Style

Enforced by [Biome](https://biomejs.dev/): 2-space indent, double quotes, semicolons, 100-char line width.

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced via `commitlint` and `husky` hooks.

- Type must be lowercase
- Subject should not be capitalized and should not end with a period
- Subject should be imperative (e.g., "add feature" not "added feature")
- Breaking changes noted in the footer with `BREAKING CHANGE:`

## Development Workflow

1. Fork and clone the repository
2. Install dependencies: `bun install`
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Make your changes and test: `bun run typecheck && bun run build && bun run preview`
5. Commit following conventional commits: `git commit -m "feat: add new feature"`
6. Push and create a pull request

## Publishing

Publishing is automated via GitHub Actions. When a version tag is pushed, the CI pipeline builds and publishes to both the public npm registry and GitHub Packages.

### Release Checklist

1. Bump version in `package.json`
2. Commit and tag:
   ```bash
   git commit -am "chore: release v0.x.x"
   git tag v0.x.x
   git push && git push --tags
   ```
3. GitHub Actions handles the rest (CI → dual publish → GitHub Release)

**Tip:** Run `npm publish --dry-run` locally to verify package contents before tagging.
