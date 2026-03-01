---
name: local-review
description: >
  Skill for working with review.xml files produced by local-review, a local
  web-based git diff review tool.

  Primary use — apply: a developer reviews a diff in the local-review UI, adds
  inline comments with change requests, exports to review.xml, then asks Claude
  to implement those changes in the local working tree. Trigger on: "apply the
  review", "implement the review comments", "apply review.xml", "implement the
  changes from the review", "do what the review says".

  Secondary use — import: fetch review comments from a GitHub PR or GitLab MR
  and write a review.xml that can be opened in local-review. Trigger on:
  "import PR comments", "import MR comments to review.xml", followed by a
  GitHub PR URL or GitLab MR URL.
---

# local-review skill

| Action | Purpose |
|--------|---------|
| `apply` | Read review.xml and implement code changes *(primary)* |
| `import <URL>` | Fetch GitHub PR / GitLab MR comments → write review.xml |
| `help` | Show this reference |

---

## Action: help

When invoked with `help` or no action, print:

```
local-review skill — available actions

  apply [flags]                              ← primary workflow
    Read review.xml produced by the local-review UI and apply every
    actionable comment as a code change in the local working tree.

    Flags:
      --input <path>     review.xml path.  Default: ./review.xml
      --file <path>      Only apply comments for this file path.
      --id <id>          Only apply the comment with this id.

  import <PR-or-MR-URL> [flags]
    Fetch review comments from a GitHub PR or GitLab MR and write review.xml.

    Flags:
      --last-comment     Only import the most recent comment.
      --output <path>    Output path.  Default: ./review.xml

  help
    Show this help text.
```

---

## Action: apply *(primary)*

The apply workflow bridges the local-review UI and the codebase:

1. Developer reviews a diff in local-review, adds inline comments.
2. Developer exports → `review.xml`.
3. Claude reads the XML and implements every actionable comment as a code edit.

**For the full step-by-step workflow**, read
[references/apply.md](references/apply.md).

**Schema reference**: [assets/review.xsd](assets/review.xsd)

**IMPORTANT**: Never run `git add` or `git commit`. Only modify working tree files.

---

## Action: import

Fetches comments from a forge and assembles `review.xml` for local-review.

**Step 1 — Detect forge from URL:**
- `https://github.com/<owner>/<repo>/pull/<N>` → GitHub
- `https://gitlab.com/<…>/-/merge_requests/<N>` or self-hosted GitLab → GitLab
- Otherwise: inform the user the URL format is unrecognised and stop.

**Step 2 — Fetch, map, and write:**
- GitHub: read [references/import-github.md](references/import-github.md)
- GitLab: read [references/import-gitlab.md](references/import-gitlab.md)
- XML assembly, validation, and report: read [references/xml-format.md](references/xml-format.md)

**Schema reference**: [assets/review.xsd](assets/review.xsd)
