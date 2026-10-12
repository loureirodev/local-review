# walkthrough — write the reading order for a change

A walkthrough tells the reviewer what the change is for and in what order to read it. It lives in `review.xml` as one `<walkthrough>` block between `<source>` and `<files>`. The UI shows it as a sidebar view and focuses the diff on one step at a time. It never edits it.

[import.md](import.md) and [open.md](open.md) enter this workflow too, at the step they name.

## Step 1 — Pin down the diff

The walkthrough describes exactly the files the UI will show. Settle which diff that is before reading anything.

- **Review file exists** (at `--output`, default `./review.xml`):
  1. Run the branch check and act on it: [branch-check.md](branch-check.md).
  2. Read its `<source>`. On `type="folder"`, tell the user walkthroughs describe git changes and stop.
  3. The diff is the one that source names:

     | `<source type>` | Changed files |
     |---|---|
     | `pending staged="false"` | `git diff --name-status -M` plus `git ls-files --others --exclude-standard` |
     | `pending staged="true"` | `git diff --cached --name-status -M` |
     | `branch base="B"` | `git diff --name-status -M B...HEAD` |
     | `github-pr`, `gitlab-mr` | `git diff --name-status -M <base>...HEAD`, with `base` from the source or the repo's default branch |
     | `agent` | The pending changes if the working tree has any, otherwise the branch against the default branch |

- **No review file**, or a clean start from `open` that replaces it: the pending changes (unstaged view, as above), or `git diff --name-status -M <base>...HEAD` with `--branch [base]` (default base: the repo's default branch).

Done when you hold the full list of changed paths, repository-relative, with the new path for renames.

## Step 2 — Read the change

Read the diff of every file in the list. On a large change (hundreds of files), read the core logic in full and classify the rest from `git diff --stat` and file names: lockfiles, generated code, renames and formatting need no line-by-line read to place.

Done when you can say in two sentences why the change exists, and every file has a reason to change you could name.

## Step 3 — Split into steps

- **One reason to change per step.** Group files by intent, never by folder or file type alone. A change with two independent core parts gets two steps, each with its own title.
- **Dependency order.** What other steps consume comes first: types and schemas before their users, a helper before its callers. Mechanical changes go last: renames, formatting, lockfiles, generated code.
- **Two to seven steps.** Split a step too large to review in one sitting; merge single-file trivial steps into their neighbour.
- **Each file in at most one step.** A file carrying two intents goes in the step of its dominant change, and its `role` mentions the other.
- **Tests** go in the step of the code they test. When they are numerous, they form their own step right after that code.
- **Every file is reviewed.** Files you leave out of every step show under Other changes, so leave out only what truly fits no step. No text calls a file or step skippable.

Done when every changed file is in one step or deliberately left for Other changes.

## Step 4 — Write each level

**Language**: write every level (titles, intent, risk, verify, roles) in the language the user writes in this conversation, or in the one they name for the walkthrough. Identifiers, paths and quoted code stay as they are in the code.

Each level answers its own question and none repeats another:

| Level | Question | Rules |
|---|---|---|
| `<intent>` | Why does the change exist, what is its shape? | Markdown. The problem, the approach, how the parts connect. No list of the steps: the UI lists them. A ` ```mermaid ` diagram goes here when the shape has more than two moving parts. |
| `<risk reversible="…">` | What could this break? | Optional markdown. Data, contracts, compatibility. `reversible="false"` when undoing the change does not undo its effect (migrations, published formats, sent messages). |
| `<step title="…">` | — | The change in the project's domain language ("Branch check before apply"), not the files ("Changes in review-check"). |
| `<verify>` | What must the reviewer check here? | Markdown list: invariants, edge cases, debatable decisions, what this step takes from earlier steps. Never narrate what the diff shows. Omit it when the step is mechanical and the title says everything. |
| `role="…"` | What part does this file play? | Plain text, one line. Optional. |

Run the **deletion test** on every sentence of every verify block: if the reviewer gets it from the intent or the diff, delete it.

A verify block that narrates:

```markdown
- Adds a `parseWalkthrough` function to the deserializer.
- Calls it from `deserializeReview`.
- Updates the tests.
```

The same step, written as checks:

```markdown
- A walkthrough `<file>` must never become a review file: parsing is scoped to each section.
- A path repeated across steps keeps its first occurrence; later ones are dropped silently.
- Markdown in `<verify>` round-trips byte for byte, including `<` and `&`.
```

## Step 5 — Write the block

```xml
  <walkthrough>
    <intent>…escaped markdown…</intent>
    <risk reversible="false">…escaped markdown…</risk>
    <step title="Walkthrough in review.xml">
      <verify>…escaped markdown…</verify>
      <file path="src/shared/types.ts" role="ReviewWalkthrough and its place on ReviewState" />
      <file path="src/cli/xml-serializer.ts" />
    </step>
  </walkthrough>
```

- Escape text and attribute values like a comment `<body>`: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`. No CDATA.
- **Existing review file**: replace the `<walkthrough>…</walkthrough>` block as a whole, or insert it right after `<source …/>`. Edit only that span: every comment, id and `viewed` attribute stays byte-identical.
- **New review file**: write the whole file, with the source of Step 1, `head` (`git rev-parse --abbrev-ref HEAD`, omitted when detached), `commit` (`git rev-parse HEAD`) and an empty `<files>`:

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <review>
    <timestamp><current-ISO-datetime></timestamp>
    <source type="pending" staged="false" head="<branch>" commit="<sha>" />
    <walkthrough>…</walkthrough>
    <files>
    </files>
  </review>
  ```

Validate when `xmllint` is available:

```bash
xmllint --noout --schema <skill-dir>/assets/review.xsd review.xml
```

Done when the file validates, every step path is in the list of Step 1, and no path appears twice.

## Step 6 — Report

```
Walkthrough written to <path>

  Steps:          <N> (<titles, comma-separated>)
  Files in steps: <N> of <total>
  Other changes:  <N>

To read it: `open --existing` with this skill, or
  local-review --output-file <path> --existing
```
