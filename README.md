# local-review

> Lightweight web-based git diff review tool powered by [@pierre/diffs](https://github.com/pierre/diffs)

A modern, browser-based code review tool that runs locally. Review your git changes with syntax highlighting, add line-level comments, track progress, and export your reviews to XML.

## Features

- **Three diff modes**: Review unstaged changes, staged changes, or entire branch diffs
- **Beautiful syntax highlighting**: Powered by Shiki with 300+ language grammars
- **Split & unified views**: Toggle between side-by-side and unified diff views
- **Line-level comments**: Add comments to specific lines on either side of the diff
- **Progress tracking**: Mark files as viewed and see your progress
- **File filtering**: Quickly find files with the search filter
- **XML export**: Save your review with all comments for later reference
- **Cross-platform**: Works on Linux, macOS, and WSL2
- **Fast & lightweight**: Built with Bun, Vite, React 19, and Tailwind CSS v4

## Requirements

- [Bun](https://bun.sh) runtime installed
- A git repository

## Installation

### From npm (when published)

```bash
npm install -g local-review
# or
bunx local-review
```

### From source

```bash
git clone <repo-url>
cd local-review
bun install
bun run build
```

## Usage

### Quick Start

```bash
# Review unstaged changes
local-review

# Review staged changes
local-review --mode staged

# Review all changes in current branch vs base (main/master/develop)
local-review --mode branch
```

### CLI Options

```
Options:
  --port <port>        Port to listen on (default: random available port)
  --no-open            Don't open the browser automatically
  --output-file <file> Output file for review XML (default: ./review.xml)
  --mode <mode>        Diff mode: unstaged, staged, branch (default: unstaged)
  --dev                Development mode (proxy to Vite dev server)
  -h, --help           Show this help message
  -v, --version        Show version number
```

### Advanced Examples

```bash
# Review on specific port without auto-opening browser
local-review --port 8080 --no-open

# Review branch changes and save to custom location
local-review --mode branch --output-file /tmp/my-review.xml

# Pass additional git diff arguments
local-review -- --ignore-all-space --word-diff
```

## Claude Code Skill — PR/MR Integration

local-review ships a [Claude Code](https://claude.ai/code) skill that bridges GitHub Pull Requests and GitLab Merge Requests with the local review UI.

### What the skill does

| Action | Description |
|--------|-------------|
| `import` | Fetch review comments from a GitHub PR or GitLab MR and write them to `review.xml` |
| `apply` | Read a `review.xml` and apply code suggestions / change instructions to the local working tree |

### Requirements

- [Claude Code](https://claude.ai/code) installed
- [`gh` CLI](https://cli.github.com) (GitHub) or [`glab` CLI](https://gitlab.com/gitlab-org/cli) (GitLab), **or** a `GITHUB_TOKEN` / `GITLAB_TOKEN` environment variable as fallback

### Importing PR/MR comments

```
/local-review import <PR-or-MR-URL>
```

**Examples:**

```bash
# Import all comments from a GitHub PR
/local-review import https://github.com/owner/repo/pull/42

# Import all comments from a GitLab MR
/local-review import https://gitlab.com/group/project/-/merge_requests/7

# Import only the last comment (useful for AI-generated review summaries)
/local-review import https://github.com/owner/repo/pull/42 --last-comment

# Write to a custom path
/local-review import https://github.com/owner/repo/pull/42 --output /tmp/pr-42.xml
```

After import, open the generated `review.xml` in local-review to browse the comments alongside the diff.

**What gets imported:**

- Inline diff comments (attached to specific file + line)
- General PR/MR discussion comments (Claude resolves file references from prose using `git ls-files`)
- Comments with no resolvable file reference are stored under the synthetic path `_discussion`

### Applying code suggestions

```
/local-review apply [flags]
```

**Examples:**

```bash
# Apply all suggestions from review.xml
/local-review apply

# Apply suggestions for a single file only
/local-review apply --file src/cli/server.ts

# Apply a specific comment by id
/local-review apply --id gh-102

# Read from a custom path
/local-review apply --input /tmp/pr-42.xml
```

The skill handles three types of comment bodies:

- **GitHub suggestion fences** (` ```suggestion `): replaces the referenced line(s) directly
- **GitLab suggestion fences** (` ```suggestion:-N+M `): replaces the specified line range
- **Prose instructions** (e.g. "rename `foo` to `bar`"): Claude interprets and applies the change

Changes are applied to the working tree only — no automatic `git add` or `git commit`.

### XML schema reference

The `review.xml` format is documented by the XSD schema bundled with the local-review skill at `.claude/skills/local-review/assets/review.xsd`.

### Help

```
/local-review help
```

## Development

### Project Structure

```
local-review/
├── src/
│   ├── cli/              # Bun backend
│   │   ├── index.ts      # CLI entry point
│   │   ├── server.ts     # HTTP server + API
│   │   ├── git.ts        # Git operations
│   │   ├── open-browser.ts   # Cross-platform browser opener
│   │   └── xml-serializer.ts # Review export
│   ├── web/              # React frontend
│   │   ├── App.tsx       # Main app
│   │   ├── components/   # UI components
│   │   ├── context/      # React context (state)
│   │   ├── hooks/        # API hooks
│   │   └── styles/       # Tailwind CSS
│   └── shared/
│       └── types.ts      # Shared TypeScript types
├── dist/                 # Build output
│   ├── cli/              # Bundled CLI
│   └── web/              # Built frontend
└── package.json
```

### Development Mode

Run with hot reload (requires Vite dev server running separately):

```bash
# Terminal 1: Start Vite dev server
bun run dev

# Terminal 2: In another terminal (optional - for frontend only)
cd src/web
bunx vite
```

The `--dev` flag proxies non-API requests to Vite dev server on port 5173 for hot module reloading.

### Build

```bash
# Type check
bun run typecheck

# Build frontend + CLI
bun run build

# Preview production build
bun run preview
```

### Architecture

- **Single server process**: `Bun.serve()` handles both API routes and static file serving
- **No Vite proxy in production**: Built frontend assets are served directly by Bun
- **API-first design**: Frontend communicates via REST API at `/api/*`
- **Shared types**: TypeScript types are shared between CLI and web via `src/shared/types.ts`

## Publishing to npm

The package is configured for npm publishing with the following setup:

### Pre-publish Checklist

1. Update version in `package.json`
2. Run tests and ensure build succeeds:
   ```bash
   bun run typecheck
   bun run build
   bun run preview  # Test the built package
   ```
3. Commit and tag the release:
   ```bash
   git commit -am "Release v0.x.x"
   git tag v0.x.x
   git push && git push --tags
   ```

### Publishing

```bash
# Dry run to see what will be published
npm publish --dry-run

# Publish to npm
npm publish

# Or publish with npm access token
npm publish --access public
```

The `prepublishOnly` script automatically runs `bun run build` before publishing to ensure `dist/` is up to date.

### Package Configuration

- **Entry point**: `dist/cli/index.js` (via `bin` field)
- **Files included**: Only `dist/` directory (frontend + CLI)
- **Runtime**: Requires Bun to be installed globally
- **Dependencies**: `@pierre/diffs`, `react`, `react-dom` (bundled in frontend)

## Roadmap

### v0.2 - Enhanced Review Features
- [ ] File-level comments (not just line-level)
- [ ] Comment threads and replies
- [ ] Markdown support in comments
- [ ] Keyboard shortcuts for navigation
- [ ] Diff statistics dashboard

### v0.3 - GitHub/GitLab Integration
- [ ] Review GitHub Pull Requests (`--github owner/repo/123`)
- [ ] Review GitLab Merge Requests (`--gitlab project!123`)
- [ ] Fetch PR/MR metadata (title, description, author)
- [ ] Post comments back to PR/MR (optional)

### v0.4 - Collaboration Features
- [ ] Multiple reviewers support
- [ ] Review status tracking (pending, approved, changes requested)
- [ ] Import/merge reviews from multiple reviewers
- [ ] JSON export format (in addition to XML)

### v0.5 - Advanced Diff Features
- [ ] Semantic diff highlighting
- [ ] Code navigation (jump to definition)
- [ ] Diff against arbitrary commits
- [ ] Support for image/binary file diffs
- [ ] Compare two branches directly

### v0.6 - UI/UX Improvements
- [ ] Light/dark theme toggle
- [ ] Configurable syntax highlighting themes
- [ ] Compact/comfortable view density options
- [ ] Custom keyboard shortcuts
- [ ] Review progress persistence (resume reviews)

### v1.0 - Production Ready
- [ ] Comprehensive test suite
- [ ] Performance optimizations for large diffs
- [ ] Documentation site
- [ ] GitHub Actions for CI/CD
- [ ] Telemetry (opt-in) for usage analytics

### Future Ideas
- Plugin system for custom diff processors
- Integration with popular IDEs (VS Code extension)
- Self-hosted review server mode
- Review templates and checklists
- AI-powered review suggestions (via LLM integration)

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Workflow

1. Fork and clone the repository
2. Install dependencies: `bun install`
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Make your changes and test: `bun run typecheck && bun run build && bun run preview`
5. Commit following conventional commits: `git commit -am "feat: add new feature"`
6. Push and create a pull request

## License

MIT

## Acknowledgments

- [@pierre/diffs](https://github.com/pierre/diffs) - Excellent React diff viewer component
- [Bun](https://bun.sh) - Fast all-in-one JavaScript runtime
- [Vite](https://vitejs.dev) - Next generation frontend tooling
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
