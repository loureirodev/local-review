# import — parse an agent review

Step 2 of [import.md](import.md). The review is a file (read it) or text pasted in the conversation. It is unstructured: markdown, bullet lists, prose.

## Parse

Split the text into distinct comments. One finding is one comment, even when it spans several sentences; a finding about several files becomes one comment per file. For each, take:

- `filePath`: a path in backticks, "in `file.ts`", a path heading.
- `line`: "line 42", "L42", "lines 10-15" (first line). Often absent; Step 4 resolves it.
- `side`: `addition`. The agent reviewed the current code.
- `body`: the finding as written, code blocks and suggestions included.
- `createdAt`: now.
- `id`: `agent-<N>`, 1-based in reading order.

## Source

The checkout the agent reviewed (`git rev-parse --abbrev-ref HEAD`, omitted when detached; `git rev-parse HEAD`). Add `agent="<name>"` when the reviewing agent is known:

```xml
<source type="agent" agent="claude" head="<branch>" commit="<sha>" />
```
