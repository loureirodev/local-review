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
# Branches and head commit, recorded on <source>
gh pr view <pr> --repo <owner>/<repo> --json headRefName,headRefOid,baseRefName

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
GET https://api.github.com/repos/<owner>/<repo>/pulls/<pr>            # head.ref, head.sha, base.ref
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
- Source element:
  `<source type="github-pr" owner="<owner>" repo="<repo>" pr="<number>" base="<baseRefName>" head="<headRefName>" commit="<headRefOid>" />`
  (REST: `base.ref`, `head.ref`, `head.sha`). These let `open` launch on the
  PR's diff and let `open`/`apply` check the branch.
- **Comment URL**: construct a permalink for each comment:
  - Review comment (inline): `https://github.com/<owner>/<repo>/pull/<pr>#discussion_r<id>`
  - General comment (issue-style): `https://github.com/<owner>/<repo>/pull/<pr>#issuecomment-<id>`
  - Store in the `<url>` element of each `<comment>`.

## Filtering comments

Before mapping, filter out noise that would clutter the review:

- **Bot comments**: skip comments from known bots (author login ending in `[bot]`,
  or common bots like `dependabot`, `renovate`, `codecov`, `sonarcloud`).
- **Resolved threads**: if fetching review comments, check `pull_request_review_id`
  grouping. When all comments in a thread are resolved (user marked as resolved
  in GitHub), consider omitting them — they represent already-addressed feedback.
  Include them only if `--include-resolved` is explicitly requested.
- **Author replies**: short replies like "fixed", "done", "will do", "addressed"
  from the PR author are acknowledgments, not actionable review comments. Skip
  them unless they contain code suggestions or substantive discussion.

## Check the branch before resolving lines

Line resolution reads local files. If the current branch
(`git rev-parse --abbrev-ref HEAD`) is not `headRefName`, report it and ask as in Steps 3–4 of
[branch-check.md](branch-check.md) (with `head=<headRefName>`) before resolving
lines. There is no review file yet, so `local-review check` does not apply here.

## Line resolution for general comments

General comments (no file/line) should be resolved to specific files and lines
whenever possible. Read [line-resolution.md](line-resolution.md) for the full
resolution algorithm.

Continue with [xml-format.md](xml-format.md) for XML assembly, validation,
and the write + report steps.
