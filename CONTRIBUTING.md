# Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) runtime installed
- [Node.js](https://nodejs.org) 22+ (for publishing steps only)

### Getting Started

```bash
git clone https://github.com/loureirodev/local-review.git
cd local-review
bun install
```

Use **bun** for everything.

### Development Mode

```bash
bun run dev
```

This starts the CLI server with `--dev`, which pins it to port 3000 (outside dev mode the port is random) and proxies non-API requests to the Vite dev server on port 5173 for hot module reloading.

### Available Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start dev mode (Vite HMR + CLI server) |
| `bun run build` | Build frontend (Vite) + CLI (bun build) |
| `bun run preview` | Run the built production binary |
| `bun run typecheck` | TypeScript type checking |
| `bun test` | Run all tests (`bun test path/to/file.test.ts` for one file) |
| `bun run lint` | Biome linter |
| `bun run lint:fix` | Auto-fix lint issues |
| `bun run lint:fix-files <files>` | Auto-fix lint issues in specific files |
| `bun run format` | Biome formatter |
| `bun run react-doctor` | React best-practice checks |

CI runs `biome ci`, `react-doctor`, typecheck and build; all must pass.

## Project Structure

```
local-review/
├── .claude/skills/local-review/  # Agent skill shipped to users (see below)
├── src/
│   ├── cli/                      # Bun backend
│   │   ├── index.ts              # CLI entry point (arg parsing, `check` command)
│   │   ├── server.ts             # HTTP server + API routes
│   │   ├── git.ts                # Git operations
│   │   ├── folder.ts             # Folder review mode (listing, guarded reads)
│   │   ├── review-check.ts       # Existing review vs current checkout, launch mode
│   │   ├── config.ts             # Display settings persisted on disk
│   │   ├── open-browser.ts       # Cross-platform browser opener
│   │   ├── xml-serializer.ts     # Review → XML
│   │   └── xml-deserializer.ts   # XML → review
│   ├── web/                      # React frontend
│   │   ├── App.tsx               # Main app orchestrator
│   │   ├── components/           # UI components (diff, comments, markdown, sidebar, walkthrough)
│   │   ├── context/              # React context (review state, collapse)
│   │   ├── hooks/                # API functions, settings, theme
│   │   ├── shortcuts/            # Keyboard shortcut registry
│   │   ├── utils/                # Pure helpers
│   │   └── styles/               # Tailwind CSS
│   └── shared/
│       └── types.ts              # TypeScript types shared between CLI and web
├── DESIGN.md                     # Visual conventions
└── dist/                         # Build output (cli/ and web/)
```

Tests sit next to their source as `*.test.ts`.

## Architecture

- **Single server process**: `Bun.serve()` handles both API routes and static file serving
- **Dev proxy**: In dev mode, the CLI server proxies non-API requests to Vite on port 5173. Vite proxies `/api` requests back to the CLI server on port 3000.
- **No Vite proxy in production**: Built frontend assets are served directly by Bun
- **API-first design**: Frontend communicates via REST API at `/api/*`
- **Shared types**: TypeScript types shared between CLI and web via `src/shared/types.ts`
- **Path alias**: `@shared` maps to `src/shared` (configured in both `vite.config.ts` and `tsconfig.json`)
- **Diff rendering**: `@pierre/diffs` `CodeView` (Shiki-based; per-line virtualization in a single owned scroll container, imperative `initialItems` + `ref.updateItem`). See `src/web/components/DiffViewer.tsx` and `diff/useCodeViewItems.ts`
- **File tree**: `@pierre/trees` (virtualized, rendered in a shadow DOM: page styles don't reach the rows; style them through `unsafeCSS`)

## The `local-review` skill

`.claude/skills/local-review/` ships to users: the README tells them to copy it into their projects. The `review.xml` format is one contract spread across several files, and a change to it updates all of them together:

- `src/shared/types.ts`, `src/cli/xml-serializer.ts` and `src/cli/xml-deserializer.ts`, covered by `src/cli/xml.test.ts`
- `.claude/skills/local-review/assets/review.xsd` and `references/xml-format.md`

A change to a CLI flag or a skill command also updates the skill's references and `README.md`.

## Code Style

Enforced by [Biome](https://biomejs.dev/): 2-space indent, double quotes, semicolons, 100-char line width. A `pre-commit` hook runs Biome on staged files.

- **Visual changes** follow `DESIGN.md` (colour roles, themes, typography, icons, shadows). Use the role utilities (`text-muted`, `bg-accent`) for every colour, never literal colour classes (`text-neutral-300`, `bg-blue-500`).
- **React effects**: derive state during render or act in event handlers; mount-only effects go through `useMountEffect` (`src/web/hooks/useMountEffect.ts`).

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/), checked by `commitlint` in a `commit-msg` hook.

- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`
- Type must be lowercase
- Subject should not be capitalized and should not end with a period
- Subject should be imperative (e.g., "add feature" not "added feature")
- Breaking changes noted in the footer with `BREAKING CHANGE:`

## Development Workflow

1. Fork and clone the repository
2. Install dependencies: `bun install`
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Make your changes and test: `bun test && bun run typecheck && bun run build && bun run preview`
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
