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

Resolved threads (skip with `--include-resolved`): REST does not say whether a thread is resolved, so list the ids of the comments in resolved threads through GraphQL:

```bash
gh api graphql --paginate -f owner=<owner> -f repo=<repo> -F pr=<pr> -f query='
  query($owner: String!, $repo: String!, $pr: Int!, $endCursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        reviewThreads(first: 100, after: $endCursor) {
          pageInfo { hasNextPage endCursor }
          nodes { isResolved comments(first: 100) { nodes { databaseId } } }
        }
      }
    }
  }' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved) | .comments.nodes[].databaseId'
```

Without `gh`: `POST https://api.github.com/graphql` with the same query as `{"query": …, "variables": {…}}`, same `Authorization` header, passing `pageInfo.endCursor` as `endCursor` while `hasNextPage`. Each `databaseId` is the `id` of an inline comment from REST.

## Filter

Drop, and count as skipped:

- **Bots**: login ending in `[bot]`, or `dependabot`, `renovate`, `codecov`, `sonarcloud`.
- **Resolved threads**: inline comments whose `id` is in the resolved list, unless `--include-resolved`.
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
