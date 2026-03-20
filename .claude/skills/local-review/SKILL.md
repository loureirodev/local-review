---
name: local-review
description: >
  Local web-based git diff review tool. Three actions:

  apply — read review.xml and implement its comments as code changes in the
  working tree. Trigger: "apply the review", "implement the review comments",
  "apply review.xml", "do what the review says".

  import — import review comments and write review.xml. Accepts a GitHub PR
  URL, GitLab MR URL, or a file/text from an AI agent code review. Trigger:
  "import PR comments", "import MR comments", "import review", "import agent
  review", "review this PR", "check the PR feedback", "load review comments",
  GitHub PR URL, GitLab MR URL, or a file path to review text.

  open — launch the local-review UI in the browser. Starts clean by default;
  add --existing to load a previously saved review.xml. Trigger: "open the
  review", "open the UI", "open local-review", "show me the review", "now open
  it", "show it in the UI".
---

# local-review skill

| Action | Purpose | Key flags |
|--------|---------|-----------|
| `apply` | Read review.xml and implement code changes *(primary)* | `--input`, `--file`, `--id` |
| `import <URL\|file>` | Import review comments from GitHub PR, GitLab MR, or agent review → write review.xml | `--last-comment`, `--output` |
| `open` | Launch the local-review web UI in the browser | `--existing`, `--port`, `--input` |

When invoked with `help` or no action, describe these actions and their flags.

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

Imports review comments from an external source and assembles `review.xml`.

**Step 1 — Detect source type from the argument:**
- `https://github.com/<owner>/<repo>/pull/<N>` → GitHub PR
- `https://gitlab.com/<…>/-/merge_requests/<N>` or self-hosted GitLab → GitLab MR
- File path (e.g. `review.md`, `/tmp/review.txt`) → Agent review (read file)
- No argument but user provides review text inline → Agent review (parse text)
- Otherwise: inform the user the format is unrecognised and stop.

**Step 2 — Fetch, map, and write:**
- GitHub: read [references/import-github.md](references/import-github.md)
- GitLab: read [references/import-gitlab.md](references/import-gitlab.md)
- Agent review: read [references/import-agent.md](references/import-agent.md)
- Line resolution (all sources): read [references/line-resolution.md](references/line-resolution.md)
- XML assembly, validation, and report: read [references/xml-format.md](references/xml-format.md)

**Key principle**: Every comment should be resolved to the most specific file
and line possible. Comments without line numbers are hard to visualize in the
UI. Read source files and search for referenced code to determine exact lines.

**Schema reference**: [assets/review.xsd](assets/review.xsd)

---

## Action: open

Launches the local-review web UI so the user can review a diff interactively.

**Full workflow**: read [references/open.md](references/open.md).
