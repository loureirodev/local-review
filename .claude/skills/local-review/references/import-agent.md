# import — Agent review workflow

Imports review comments from an AI agent's code review output and generates
`review.xml` with precise file and line mappings.

## Input sources

The agent review text can come from:
- A file path: `import <path>` (e.g. `import review.md`, `import /tmp/review.txt`)
- Inline text provided by the user in the conversation

## Step 1 — Detect source type

If the argument is NOT a URL (no `https://` prefix and no GitHub/GitLab URL pattern):
- If it looks like a file path, read it with the Read tool.
- If no argument is given, ask the user to provide the review text or file path.

## Step 2 — Parse review comments

Agent review text is typically unstructured (markdown, plain text, bullet lists).
Extract each distinct review comment by identifying:

- **File references**: paths in backticks, "in `file.ts`", "file `src/foo.ts`"
- **Line references**: "line 42", "L42", "lines 10-15", code snippets with context
- **Code suggestions**: fenced code blocks with suggested replacements
- **Prose instructions**: "rename X to Y", "extract this into a function", etc.

For each extracted comment, collect:
- `filePath` — the referenced file
- `line` — the referenced line number (may be null initially)
- `side` — typically `"addition"` for agent reviews (reviewing current code)
- `body` — the comment text

## Step 3 — Resolve line numbers (critical)

Agent reviews often reference code without exact line numbers. **Every comment
must be resolved to a specific line** whenever possible, because the UI needs
line-level positioning to display comments inline with the diff.

For each comment missing a line number:

1. **Read the target file** using the Read tool.
2. **Search for the referenced code** — function names, variable names, code
   snippets mentioned in the comment body.
3. **Match to exact line number** — use Grep or manual search in the file
   contents to find the line where the referenced code appears.
4. **Pick the most specific line** — if the comment references a function,
   use the line where the function is defined. If it references a specific
   statement, use that statement's line.
5. **Fall back to file-level** — only if no line can be determined, omit
   `<line>` (file-level comment). This should be rare.

### Resolution examples

| Comment text | Resolution |
|---|---|
| "The `handleClick` function should validate input" | Read file → find `function handleClick` or `const handleClick` → use that line |
| "Line 42: rename `foo` to `bar`" | Line 42 (explicit) |
| "The import of `lodash` is unused" | Find the import statement line |
| "This component is too complex" | File-level (no specific line) |

## Step 4 — Generate comment IDs

Use prefix `agent-<N>` where N is a 1-based sequential index:
`agent-1`, `agent-2`, etc.

## Step 5 — Assemble XML

Source element:

```xml
<source type="agent" />
<!-- or, if the agent name is known: -->
<source type="agent" agent="claude" />
```

Continue with [xml-format.md](xml-format.md) for XML assembly, validation,
and the write + report steps. Use `type="agent"` in the source element and
follow the same grouping, escaping, and validation rules.

## Step 6 — Report

Print:

```
Import complete — review.xml written to <output-path>

  Source:         Agent review
  Total comments: <N>
  Inline (line):  <N>
  File-level:     <N>
  Unresolved:     <N>  (stored under _discussion)

To view in local-review:
  local-review --output-file <output-path> --existing
```
