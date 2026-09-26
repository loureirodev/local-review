# apply — full workflow

## Step 0 — Check the branch

Run [branch-check.md](branch-check.md) (`local-review check --json`) before
touching any file. If it ends in cancel or a stop, do not edit anything. If it
moved to a worktree, every edit below happens inside that worktree.

## Step 1 — Read review.xml

Read the file at `--input` path (default: `./review.xml`).

If `<source type="folder" path="...">`, file paths in the review are relative
to that folder, not to the repository: resolve each `filePath` as
`<path>/<filePath>`.

Parse the XML to extract all `<comment>` elements. For each, collect:
- `id` — attribute on `<comment>`
- `filePath` — text content of `<file>` child
- `line` — `number` attribute of `<line>` child, or `null` if `<line>` absent
- `side` — `side` attribute of `<line>` child, or `null` (always absent in
  folder reviews)
- `body` — text content of `<body>` child
- `createdAt` — text content of `<created-at>` child

## Step 2 — Apply filters

If `--file <path>` was given: keep only comments where `filePath` equals `<path>`.

If `--id <id>` was given: keep only the comment with matching `id`.

## Step 3 — Process each comment

For each comment in the filtered list, determine the kind of change it requests:

**A. GitHub-style suggestion fence** — body contains ` ```suggestion `

- Extract the content between the opening and closing fences.
- Replace the line(s) at `line` in `filePath` with the suggestion content.
- Use the Edit tool to replace exactly that line (or range, if B applies).

**B. GitLab-style suggestion fence** — body contains ` ```suggestion:-N+M `

- `-N` = N lines before `line`; `+M` = M lines after `line`.
- Replacement range: `(line - N)` through `(line + M)` inclusive.
- Extract content inside the fence and use the Edit tool to replace that range in `filePath`.

**C. Prose change instruction** — no suggestion fence, but body describes a code change
(e.g. "rename `foo` to `bar`", "extract into a helper", "remove unused import").

- Use `line` and `filePath` as the target location.
- Interpret the instruction and apply the change with Edit or Write on `filePath`.
- If the instruction is ambiguous, skip it and note as "skipped (ambiguous)".

**D. Non-actionable comment** — question, praise, or general feedback with no discernible change.

- Skip. Note as "skipped (no action)".

### Handling `side` attribute

- No `side` (folder review): `line` is a line of the file as it is on disk.
  Apply the change at that line directly.

- `side="addition"` (right side of diff): the line number refers to the current
  version of the file. Read the file and apply the change at that line directly.
- `side="deletion"` (left side of diff): the line number refers to code that was
  removed. The current file may not have that line anymore. Search for the
  referenced code snippet in the comment body and apply the change where the
  surrounding context exists. If the deleted code is no longer present and the
  comment is not applicable, skip it and note as "skipped (deleted code)".

### Handling `edited` attribute

Comments with `edited="true"` were modified by the user in the local-review UI
after being imported from a forge (GitHub/GitLab). The body reflects the user's
revised intent — always use the body as-is, which already contains the edited
version.

**IMPORTANT**: Do NOT run `git add` or `git commit`. Only modify the working tree.

## Step 4 — Handle errors without aborting

If applying a specific comment fails (file not found, line out of range, search text missing):
- Log the failure with the comment `id` and reason.
- Continue to the next comment.

## Step 5 — Print apply summary

```
Apply complete

  Applied:  <N> comments
  Skipped:  <N> comments  (no action / ambiguous)
  Failed:   <N> comments

Modified files:
  - src/foo.ts
  - src/bar.ts

Skipped:
  - <id>: skipped (no action) — "Looks good overall!"
  - <id>: skipped (ambiguous) — "Maybe refactor this?"

Failed:
  - <id>: line 42 not found in src/baz.ts

Changes are unstaged. Review with: git diff
```

No commits or staging is performed automatically.
