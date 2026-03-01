# import — GitLab workflow

## Tool availability

Run `which glab` (or `glab --version`):
- Available → use `glab` CLI (option A).
- Not available → check for `GITLAB_TOKEN` env var → use REST API (option B).
- Neither → tell the user to install `glab` or export `GITLAB_TOKEN=<token>`, then stop.

URL-encode the project path when using API calls: replace `/` with `%2F`.

## Option A — Fetch via `glab` CLI

```bash
# Diff notes (inline, attached to specific files/lines)
glab api projects/<url-encoded-project>/merge_requests/<mr>/discussions \
  --paginate

# General notes (not attached to diff positions)
glab api projects/<url-encoded-project>/merge_requests/<mr>/notes \
  --paginate
```

## Option B — Fetch via REST API (GITLAB_TOKEN fallback)

Use `fetch` with header `Authorization: Bearer $GITLAB_TOKEN`.
Paginate using the `X-Next-Page` response header.

```
GET https://gitlab.com/api/v4/projects/<url-encoded-project>/merge_requests/<mr>/discussions
GET https://gitlab.com/api/v4/projects/<url-encoded-project>/merge_requests/<mr>/notes
```

For self-hosted GitLab, replace `gitlab.com` with the host from the URL.

## Response fields

**Discussion** object contains a `notes` array. Each note has:
```
id           — numeric id
body         — comment text
created_at   — ISO datetime
position     — present for diff notes, null for general notes
  .new_path  — file path
  .new_line  — line number on the right (addition) side; null for context lines
  .old_line  — line number on the left (deletion) side; null for new lines
  .line_range— optional; present for multi-line notes
```

## Mapping to ReviewComment

- If `position` is present and `position.new_line` is non-null → side `"addition"`, line = `new_line`.
- If `position` is present and `position.new_line` is null but `old_line` non-null → side `"deletion"`, line = `old_line`.
- If `position` is null → general comment (no file/line).
- Comment id prefix: `gl-<id>`.
- Source element: `<source type="gitlab-mr" project="<project>" mr="<number>" />`

Continue with [xml-format.md](xml-format.md) for general-comment resolution, XML assembly,
validation, and the write + report steps.
