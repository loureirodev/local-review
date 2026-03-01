# apply — full workflow

## Step 1 — Read review.xml

Read the file at `--input` path (default: `./review.xml`).

Parse the XML to extract all `<comment>` elements. For each, collect:
- `id` — attribute on `<comment>`
- `filePath` — text content of `<file>` child
- `line` — `number` attribute of `<line>` child, or `null` if `<line>` absent
- `side` — `side` attribute of `<line>` child, or `null`
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
