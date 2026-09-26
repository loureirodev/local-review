# Branch check — before `open --existing` and `apply`

A review's line numbers only mean something on the code it was made against.
The CLI compares the review with the checkout deterministically; the skill
only reacts to its result. Never compare branches by reading the XML yourself.

Run this **before** launching the server (`open --existing`) or editing any
file (`apply`).

---

## Step 1 — Run the check

```bash
local-review check --output-file <review-xml-path> --json
```

Exit status: `0` go ahead (warnings may be present), `3` blocked, `1` no review
file (or unreadable). `expected.worktree` is set on a `branch-mismatch` when
`head` is already checked out in another worktree. The JSON on stdout:

```json
{
  "status": "ok | branch-mismatch | folder-missing | no-review",
  "warnings": ["commit-mismatch", "unverified"],
  "expected": { "head": "feat/x", "commit": "<sha>", "path": "/abs/docs", "worktree": "/abs/repo-feat-x" },
  "current": { "branch": "main", "commit": "<sha>" },
  "source": { "type": "github-pr", "owner": "…", "repo": "…", "pr": 42, "…": "…" }
}
```

If `local-review` is not installed, tell the user the check needs it
(`npm install -g @loureirodev/local-review`) and stop.

## Step 2 — React to the result

| `status` | Action |
|---|---|
| `ok` | Relay the warnings, if any (below), and continue |
| `no-review` | Report there is no review at that path and stop |
| `folder-missing` | Report `expected.path` no longer exists and stop |
| `branch-mismatch` | Report, then ask (Step 3) |

Warnings, relayed in one line each:

- `commit-mismatch` — "The review was made at `<expected.commit>` (short); the branch is now at `<current.commit>`. Lines may be offset."
- `unverified` — "The review does not record its branch; it could not be verified."

For a `branch-mismatch`, report the facts:

```
This review was made on <expected.head> (<short commit>), but you are on <current.branch>.
Source: GitHub PR #<pr> (<owner>/<repo>)        ← when source is a forge
Line numbers may not match the files you have checked out.
```

## Step 3 — Ask

Use the AskUserQuestion tool. Options, in this order:

1. **Use the worktree at `<expected.worktree>`** — only when `expected.worktree`
   is set; then leave out options 2 and 3 (git refuses to check out a branch
   that another worktree already has). Go to Step 5.
2. **Switch to `<expected.head>`** — Step 4, then run Step 1 again.
3. **Open `<expected.head>` in a new worktree** — Step 5. Leaves the current
   checkout and its local changes untouched; recommend it when
   `git status --porcelain` is not empty.
4. **Continue on `<current.branch>`** — `open` launches with `--no-check`;
   `apply` proceeds.
5. **Cancel** — stop. Do not launch the server, do not edit files.

## Step 4 — Switch safely

1. Check for local work:

   ```bash
   git status --porcelain
   ```

   If the output is not empty, list the changed files and tell the user the
   switch could carry or conflict with them. Offer the worktree (Step 5)
   instead, or ask whether to proceed. **Never** run `git stash`, `git reset`,
   `git checkout -- <file>`, `git clean` or `git switch --force` /
   `--discard-changes` unless the user explicitly asks for that specific
   command.

2. Switch:

   - `head` exists locally (`git rev-parse --verify --quiet refs/heads/<head>`):
     `git switch <head>`
   - Not local, GitHub PR source and `gh` available: `gh pr checkout <pr>`
   - Otherwise: `git fetch origin <head>` then `git switch <head>`
     (`git switch` creates the tracking branch from `origin/<head>`).

3. If any command fails, show its error and stop. Do not retry with force.

## Step 5 — Work in a worktree

1. Pick the directory:

   - Existing worktree: `expected.worktree`.
   - New worktree: `<repo-root>/../<repo-name>-<head>`, with every `/` in
     `head` replaced by `-` (`feat/x` in `~/src/app` → `~/src/app-feat-x`).
     If that path already exists, ask the user for another one.

2. Create it (new worktree only), from the current repository:

   - `head` exists locally: `git worktree add <dir> <head>`
   - Not local, GitHub PR source and `gh` available:
     `git worktree add --detach <dir>`, then `gh pr checkout <pr>` run inside
     `<dir>`
   - Otherwise: `git fetch origin <head>` then
     `git worktree add --track -b <head> <dir> origin/<head>`

   If any command fails, show its error and stop. Do not retry with force.

3. From here on, `<dir>` is the working directory of the action:

   - Make the review path absolute **before** changing directory; the review
     file stays where it is.
   - Run Step 1 again inside `<dir>` (`cd <dir> && local-review check …`).
   - `open` runs the server inside `<dir>`; `apply` resolves every file path
     of the review against `<dir>` and edits the files there, never in the
     original checkout.

4. When done, tell the user the worktree stays in place and how to remove it:
   `git worktree remove <dir>`. Never remove it yourself.
