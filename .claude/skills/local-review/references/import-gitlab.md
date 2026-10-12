# import — fetch and map a GitLab MR

Step 2 of [import.md](import.md). `<project>` is the path from the URL, URL-encoded in API calls (`/` → `%2F`); `<host>` is `gitlab.com` or the self-hosted host from the URL.

## Fetch

With `glab` installed (`glab --version`):

```bash
glab api projects/<project>/merge_requests/<mr>                            # source_branch, target_branch, diff_refs.head_sha
glab api projects/<project>/merge_requests/<mr>/discussions --paginate    # threads, with diff positions
glab api projects/<project>/merge_requests/<mr>/notes --paginate          # general notes
```

Without `glab` but with `GITLAB_TOKEN`: the same endpoints under `https://<host>/api/v4/`, with header `Authorization: Bearer $GITLAB_TOKEN`, following the `X-Next-Page` header.

Neither: tell the user to install `glab` or export `GITLAB_TOKEN`, and stop.

## Filter

Drop, and count as skipped:

- **Bots**: `username` containing `bot`, or `dependabot`, `renovate`, `gitlab-bot`.
- **Resolved discussions** (`resolved: true`), unless `--include-resolved`.
- **Acknowledgements**: replies like "fixed", "done", "will do" with no suggestion or substantive discussion.

## Map

Each discussion holds `notes`; each note has `id`, `body`, `created_at` and `position` (null on general notes).

| `position` | `filePath` | `line` | `side` |
|---|---|---|---|
| `new_line` set | `new_path` | `new_line` | `addition` |
| `new_line` null, `old_line` set | `new_path` | `old_line` | `deletion` |
| null | none (resolved in Step 4) | none | none |

- `id`: `gl-<id>`.
- `url`: `https://<host>/<project>/-/merge_requests/<mr>#note_<id>`.

Source:

```xml
<source type="gitlab-mr" project="<project>" mr="<mr>" base="<target_branch>" head="<source_branch>" commit="<diff_refs.head_sha>" />
```
