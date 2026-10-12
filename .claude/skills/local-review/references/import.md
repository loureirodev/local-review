# import — write a review from an external source

Every source runs the same pipeline; only Step 2 differs.

## Step 1 — Detect the source

| Argument | Source | Read in Step 2 |
|---|---|---|
| `https://github.com/<owner>/<repo>/pull/<N>` | GitHub PR | [import-github.md](import-github.md) |
| `https://<host>/<project>/-/merge_requests/<N>` (gitlab.com or self-hosted) | GitLab MR | [import-gitlab.md](import-gitlab.md) |
| A file path, or review text pasted in the conversation | Agent review | [import-agent.md](import-agent.md) |

Anything else: tell the user the format is unrecognised and stop. No argument and no text: ask for the review text or its path.

## Step 2 — Fetch and map

Follow the source's reference. Done when you hold every comment as `id`, `filePath` (or none), `line` and `side` (or none), `body`, `createdAt`, `url` (forges), and the `<source>` attributes including `head` and `commit`.

With `--last-comment`, keep only the comment with the latest `createdAt`.

## Step 3 — Check the branch

Line resolution and the walkthrough read local files, so they must read the reviewed revision. Forge imports run [branch-check.md](branch-check.md) as it describes for an import. An agent review reviewed the current checkout: it always passes.

Done when the checkout is on `head` at `commit`, or the user chose to continue or cancel (cancel: stop, write nothing).

## Step 4 — Resolve lines

Resolve every comment without a line, and every comment without a file, with [line-resolution.md](line-resolution.md). Done when each comment has its most specific position: a line, else a file, else `_discussion`.

## Step 5 — Assemble and validate

Write the XML as in [xml-format.md](xml-format.md) to `--output` (default `./review.xml`). Done when it validates.

## Step 6 — Write the walkthrough

No source sends one, so offer it for every import; a walkthrough is written on request, never on its own. When the request already answers (`--walkthrough`, `--no-walkthrough`, or in words), take that answer; otherwise ask with AskUserQuestion: "Write a walkthrough of this change into the review?"

On yes, follow [walkthrough.md](walkthrough.md) from its Step 2 on the review just written; Step 1 is settled by Steps 3 and 5 here (the diff is the one the `<source>` names). Done when the user answered, and on yes the walkthrough validates.

## Step 7 — Report

```
Import complete — <output-path>

  Source:         GitHub PR #<pr> (<owner>/<repo>) | GitLab MR !<mr> (<project>) | Agent review
  Comments:       <N>  (<N> on a line, <N> file-level, <N> in _discussion)
  Walkthrough:    <N> steps, <N> files in Other changes   | not written
  Skipped:        <N>  (bots, resolved threads, acknowledgements)   ← forges only

Open it: `open --existing` with this skill (checks the branch first), or
  local-review --output-file <output-path> --existing
```
