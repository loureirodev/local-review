# import — fetch and map a GitHub PR

Step 2 of [import.md](import.md).

## Fetch

With `gh` installed (`gh --version`):

```bash
gh pr view <pr> --repo <owner>/<repo> --json headRefName,headRefOid,baseRefName
gh api repos/<owner>/<repo>/pulls/<pr>/comments --paginate --jq '.[]'    # inline
gh api repos/<owner>/<repo>/issues/<pr>/comments --paginate --jq '.[]'   # general
```

Without `gh` but with `GITHUB_TOKEN`: the same three endpoints under `https://api.github.com/repos/<owner>/<repo>/` (`pulls/<pr>` gives `head.ref`, `head.sha`, `base.ref`), with headers `Authorization: Bearer $GITHUB_TOKEN` and `Accept: application/vnd.github+json`, following `rel="next"` in the `Link` header.

Neither: tell the user to install `gh` or export `GITHUB_TOKEN`, and stop.

## Filter

Drop, and count as skipped:

- **Bots**: login ending in `[bot]`, or `dependabot`, `renovate`, `codecov`, `sonarcloud`.
- **Resolved threads**, unless `--include-resolved`.
- **Acknowledgements**: replies like "fixed", "done", "will do" with no suggestion or substantive discussion.

## Map

| Field | Inline comment | General comment |
|---|---|---|
| `id` | `gh-<id>` | `gh-<id>` |
| `filePath` | `path` | none (resolved in Step 4) |
| `line` | `line`, else `original_line` | none |
| `side` | `RIGHT` → `addition`, `LEFT` → `deletion` | none |
| `body`, `createdAt` | `body`, `created_at` | `body`, `created_at` |
| `url` | `https://github.com/<owner>/<repo>/pull/<pr>#discussion_r<id>` | `…/pull/<pr>#issuecomment-<id>` |

Source:

```xml
<source type="github-pr" owner="<owner>" repo="<repo>" pr="<pr>" base="<baseRefName>" head="<headRefName>" commit="<headRefOid>" />
```
