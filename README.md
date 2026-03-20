# local-review

> Local code review UI that turns GitHub PRs, GitLab MRs, and local diffs into actionable review files for AI agents.

Import review comments from a PR or MR, review local changes from scratch, or browse an agent-generated review — all in a browser-based diff viewer with syntax highlighting and inline comments. Export the result as a `review.xml` that any AI coding agent can pick up and apply to your working tree.

**Workflow:**

1. **Import** comments from a GitHub PR, GitLab MR, or AI agent review
2. **Review** the diff with syntax highlighting, inline comments, and progress tracking
3. **Export** to `review.xml`
4. **Apply** — let an AI agent implement the review comments as code changes

## Agent Skill

local-review ships an agent skill that automates the import and apply steps. Compatible with any AI coding agent that supports skill invocation (e.g., Claude Code, Cursor, Windsurf).

### Actions

| Command | Description |
|---------|-------------|
| `/local-review import <URL>` | Fetch comments from a GitHub PR or GitLab MR and write `review.xml` |
| `/local-review apply` | Read `review.xml` and apply suggestions / instructions to the working tree |
| `/local-review open` | Launch the review UI in the browser |
| `/local-review help` | Show all available options |

### Setup

Copy the skill into your project:

```bash
# From a clone of the local-review repo
cp -r .claude/skills/local-review <your-project>/.claude/skills/local-review
```

Your agent will automatically detect the skill on the next session.

### Requirements

- An AI coding agent that supports skills (e.g., [Claude Code](https://claude.ai/code), Cursor, Windsurf)
- [`gh` CLI](https://cli.github.com) (GitHub) or [`glab` CLI](https://gitlab.com/gitlab-org/cli) (GitLab), **or** a `GITHUB_TOKEN` / `GITLAB_TOKEN` environment variable

### Importing PR/MR comments

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

**What gets imported:**

- Inline diff comments (attached to specific file + line)
- General PR/MR discussion comments (the agent resolves file references from prose using `git ls-files`)
- Comments with no resolvable file reference are stored under the synthetic path `_discussion`

### Applying code suggestions

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
- **Prose instructions** (e.g. "rename `foo` to `bar`"): the agent interprets and applies the change

Changes are applied to the working tree only — no automatic `git add` or `git commit`.

### XML schema reference

The `review.xml` format is documented by the XSD schema bundled with the skill at `.claude/skills/local-review/assets/review.xsd`.

## Installation

```bash
npm install -g @loureirodev/local-review
```

Also available from GitHub Packages — configure `.npmrc` first:

```
@loureirodev:registry=https://npm.pkg.github.com
```

### Requirements

- [Bun](https://bun.sh) runtime (the CLI runs on Bun)
- A git repository

## Standalone Usage

The review UI can also be used directly from the CLI, without the agent skill:

```bash
# Review unstaged changes
local-review

# Review staged changes
local-review --mode staged

# Review all changes in current branch vs base (main/master/develop)
local-review --mode branch

# Load a previously saved review
local-review --existing
```

### CLI Options

```
Options:
  --port <port>        Port to listen on (default: random available port)
  --no-open            Don't open the browser automatically
  --output-file <file> Output file for review XML (default: ./review.xml)
  --mode <mode>        Diff mode: unstaged, staged, branch (default: unstaged)
  --existing           Load existing review.xml on startup
  -h, --help           Show this help message
  -v, --version        Show version number
```

## Features

- **Three diff modes**: Unstaged, staged, or full branch diffs
- **Syntax highlighting**: Powered by Shiki with 300+ language grammars
- **Split & unified views**: Toggle between side-by-side and unified diff
- **Line-level & file-level comments**: Add comments to specific lines or entire files
- **Progress tracking**: Mark files as viewed and track your review progress
- **File filtering**: Quickly find files with search
- **XML export**: Save your review for AI agents or later reference
- **GitHub/GitLab integration**: Import PR/MR comments via agent skill
- **Cross-platform**: Linux, macOS, and WSL2

## Future

- Performance optimizations for large diffs
- Markdown support in comments
- Keyboard shortcuts for navigation
- Light/dark theme toggle

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture details, and the release process.

## License

MIT
