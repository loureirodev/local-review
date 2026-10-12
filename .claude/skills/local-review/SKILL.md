---
name: local-review
description: Reviews in the local-review UI and its review.xml file. Use when the user wants to see changes in the review UI, act on the comments of a review.xml, bring a GitHub PR, GitLab MR or another agent's review into the UI, or get a reading order for a change before reviewing it.
---

# local-review

Every action reads or writes one **review file**: `--output` / `--input`, default `./review.xml`. Its format is [assets/review.xsd](assets/review.xsd).

| Action | Does | Flags | Read |
|---|---|---|---|
| `apply` | Implements the review's comments in the working tree | `--input`, `--file`, `--id` | [apply.md](references/apply.md) |
| `import <URL\|file>` | Writes a review from a PR, an MR or an agent review; offers a walkthrough | `--output`, `--last-comment`, `--include-resolved`, `--[no-]walkthrough` | [import.md](references/import.md) |
| `open` | Launches the UI; offers a walkthrough when the review lacks one | `--existing`, `--branch [base]`, `--folder <path>`, `--port`, `--input` | [open.md](references/open.md) |
| `walkthrough` | Writes the reading order into the review, keeping its comments | `--branch [base]`, `--output` | [walkthrough.md](references/walkthrough.md) |

With `help` or no action, describe this table.

Rules for every action:

- **Working tree only.** Edits stay unstaged and uncommitted; `git add` and `git commit` are the user's.
- **Line numbers belong to a revision.** Before an action reads lines of an existing review against the checkout (`open --existing`, `apply`), run the branch check: [branch-check.md](references/branch-check.md). Never compare branches by reading the XML yourself.
- **Folder reviews** (`<source type="folder">`) are made in the UI only: imports and walkthroughs describe git changes and stop on them.
- If `local-review` is not installed, tell the user to run `npm install -g @loureirodev/local-review` and stop.
