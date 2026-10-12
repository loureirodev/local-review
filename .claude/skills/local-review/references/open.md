# open — launch the review UI

The UI loads a review file only with `--existing`; a clean session ignores it and overwrites it on export. A walkthrough therefore reaches the UI only inside a review opened with `--existing`, and that is how a clean start with a walkthrough works: a review file with the walkthrough and no comments.

The mode is fixed for the session: pending changes (no flag, with an `Unstaged | Staged` toggle), `--branch [base]` (default base: main, master or develop), or `--folder <path>` (no diff, no git needed). `--branch` and `--folder` exclude each other.

## Step 1 — Verify

- **`--existing`**: run [branch-check.md](branch-check.md). Cancel or stop: the server does not start. Remember whether the user chose to continue on another branch, and the worktree if it moved to one.
- **Clean, not `--folder`**: `git rev-parse --show-toplevel`; on failure, report it and stop.

## Step 2 — Offer a walkthrough

Ask only when the review lacks one; a walkthrough is written on request, never on its own. Skip this step when:

- the mode is `--folder`, or the review's `<source>` is `type="folder"`;
- `--existing` and the review already has a `<walkthrough>`;
- the user already answered for this review in this conversation (in the request, or when an import asked).

Otherwise ask with AskUserQuestion:

| Session | Question | On yes |
|---|---|---|
| `--existing` | "This review has no walkthrough. Write one before opening?" | [walkthrough.md](walkthrough.md) from its Step 2, on this review's diff (the branch check is done) |
| Clean | "Start with a walkthrough of <the pending changes \| the branch against <base>>?" | [walkthrough.md](walkthrough.md) Step 1 "No review file" for the launch mode, then launch with `--existing` |

In a clean session whose review file already exists, the yes option says it replaces `<review-path>` and its comments; a user who wants to keep them picks no, or opens with `--existing`.

Done when the user answered, and on yes the walkthrough validates.

## Step 3 — Run the server

Run it in the background; it opens the browser and prints its URL.

```bash
# clean session
local-review --output-file <review-path> [--branch [base] | --folder <path>] [--port <port>]

# --existing, or a clean start with a walkthrough: no mode flag, the CLI takes it from <source>
local-review --output-file <review-path> --existing [--no-check] [--port <port>]
```

`--no-check` only when the user chose to continue on another branch; otherwise the CLI re-checks and exits with status 3. In a worktree, run it inside the worktree with the absolute review path.

Tell the user: the URL, the mode, where exports are saved, the worktree if any, whether comments and a walkthrough were loaded, and `Ctrl+C` to stop.
