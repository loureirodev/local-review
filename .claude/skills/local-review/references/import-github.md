# import — GitHub workflow

## Tool availability

Run `which gh` (or `gh --version`):
- Available → use `gh` CLI (option A).
- Not available → check for `GITHUB_TOKEN` env var → use REST API (option B).
- Neither → tell the user to install `gh` (`brew install gh` / `winget install gh`)
  or export `GITHUB_TOKEN=<token>`, then stop.

## Option A — Fetch via `gh` CLI

Run in sequence, capturing JSON output:

```bash
# Inline review comments (attached to specific files/lines)
gh api repos/<owner>/<repo>/pulls/<pr>/comments \
  --paginate --jq '.[]'

# General PR comments (issue-style, not attached to diff lines)
gh api repos/<owner>/<repo>/issues/<pr>/comments \
  --paginate --jq '.[]'
```

## Option B — Fetch via REST API (GITHUB_TOKEN fallback)

Use `fetch` with header `Authorization: Bearer $GITHUB_TOKEN` and
`Accept: application/vnd.github+json`. Paginate by following `rel="next"` URLs
in the `Link` response header.

```
GET https://api.github.com/repos/<owner>/<repo>/pulls/<pr>/comments
GET https://api.github.com/repos/<owner>/<repo>/issues/<pr>/comments
```

## Response fields

**Review comment** (inline):
```
path          — file path (e.g. "src/foo.ts")
line          — line number in the diff (right side / addition)
original_line — original line number (left side / deletion); use when line is null
side          — "RIGHT" (addition) or "LEFT" (deletion)
body          — comment text
id            — numeric id
created_at    — ISO datetime
```

**General comment** (no path/line):
```
body       — comment text
id         — numeric id
created_at — ISO datetime
```

## Mapping to ReviewComment

- Side: `"RIGHT"` → `"addition"`, `"LEFT"` → `"deletion"`.
- Line: use `line` if non-null, otherwise `original_line`.
- Comment id prefix: `gh-<id>`.
- Source element: `<source type="github-pr" owner="<owner>" repo="<repo>" pr="<number>" />`

Continue with [xml-format.md](xml-format.md) for general-comment resolution, XML assembly,
validation, and the write + report steps.
