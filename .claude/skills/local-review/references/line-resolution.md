# Line resolution — resolving comments to exact file positions

This reference applies to ALL import sources (GitHub, GitLab, agent). The goal
is to ensure every comment in review.xml has the most precise `<line>` possible,
because the UI displays comments inline with the diff.

## When to resolve

- **Inline comments with a line number**: already resolved — use as-is.
- **General/file-level comments that reference code**: resolve to a line.
- **Agent reviews without explicit lines**: always attempt resolution.

## Resolution algorithm

For each comment that lacks a line number:

### 1. Extract code references from the body

Look for:
- Backtick-quoted identifiers: `` `functionName` ``, `` `variableName` ``
- File path mentions: `src/foo.ts`, `in foo.ts`
- Code snippets in fenced blocks
- Function/method/class names in prose

### 2. Read the target file

Use the Read tool to get the full file contents with line numbers.

### 3. Search for the referenced code

Use Grep or scan the file for:
- Function/method definitions (`function X`, `const X =`, `def X`, `class X`)
- Variable declarations
- Import statements
- The exact code snippet if provided

### 4. Select the best line

Priority order:
1. Exact match of a code snippet → first line of the snippet
2. Function/method definition line → the `function`/`def`/`class` keyword line
3. Variable assignment → the `const`/`let`/`var` line
4. Import statement → the `import` line
5. First occurrence of the identifier in the file

### 5. Determine the side

- If the line exists in the current version (right side of diff) → `"addition"`
- If referring to deleted code → `"deletion"`
- Default to `"addition"` for agent reviews (reviewing current code)

### 6. Fall back gracefully

If no line can be determined:
- File is known → file-level comment (no `<line>` element)
- File is unknown → `_discussion` bucket
