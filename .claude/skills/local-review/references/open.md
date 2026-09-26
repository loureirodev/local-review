# Action: open

Launches the local-review web UI in the browser so the user can review
interactively. By default the UI starts clean. Pass `--existing` to load a
previously saved review.xml into the UI (comments + viewed state).

The launch mode is fixed for the whole session:

| Flag | Mode |
|---|---|
| *(none)* | Pending changes, with an `Unstaged | Staged` toggle in the UI |
| `--branch [base]` | Current branch vs `base` (autodetected: main, master, develop) |
| `--folder <path>` | Files of a folder, no diff; works outside a git repo |

`--branch` and `--folder` are mutually exclusive.

---

## Step 1 — Resolve the review.xml path

- Default: `./review.xml` in the current working directory.
- If the user passed `--input <path>`, use that path instead.

---

## Step 2 — Verify before launching

- **Clean session:** in any mode but `--folder`, check the repository with
  `git rev-parse --show-toplevel`; if it fails, report the error and stop.
- **With `--existing`:** run [branch-check.md](branch-check.md). If it ends in
  cancel or a stop, the server must not start. Remember whether the user chose
  to continue on another branch, and the worktree directory if it moved there
  (the server then runs inside it, with the absolute review path).

---

## Step 3 — Run the server

Clean session — pass the mode the user asked for, if any:

```bash
local-review --output-file <review-xml-path> [--branch [base] | --folder <path>] [--port <port>]
```

With `--existing` — pass **no mode flag**: the CLI derives it from the review
(a PR review opens as `--branch <target>`, a folder review as
`--folder <path>`, …). Add `--no-check` only if the user chose to continue on
another branch; otherwise the CLI re-checks and would exit with status 3.

```bash
local-review --output-file <review-xml-path> --existing [--no-check] [--port <port>]
```

Run it in the background: the server keeps running until stopped. The browser
opens automatically and the server prints its URL on startup.

Tell the user:
- The URL (e.g. `http://localhost:XXXXX`)
- The launch mode used (from the UI header, or the flag passed)
- Where exports will be saved (`<review-xml-path>`)
- The worktree directory, if the review opened in one
- Whether comments were loaded from an existing file (if `--existing` was used)
- How to stop: `Ctrl+C`

---

## Typical follow-up after `import`

1. `import <URL>` → writes review.xml with PR/MR comments
2. `open --existing` → checks the branch, launches the UI on the PR's diff
3. `apply` → Claude implements the actionable comments as code changes
