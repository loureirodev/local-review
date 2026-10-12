# Line resolution — place every comment on its most specific position

Step 4 of [import.md](import.md). The UI shows a comment inline only when it has a line, so a line is the target and `_discussion` the last resort. Comments that already carry a line keep it.

## Comment without a file

1. Find the paths it mentions: backtick-quoted paths, "in `foo.ts`", a function name tied to a file.
2. Match each against `git ls-files` (exact, then suffix, then basename).
3. One comment per matched file, same body; suffix the id (`gh-123-1`, `gh-123-2`).
4. No match: keep one comment on `_discussion`, with no line.

Then resolve each new comment's line below.

## Comment without a line

1. Take its code references: backtick-quoted identifiers, fenced snippets, function or class names in prose.
2. Read the file with line numbers and search for them.
3. Pick the line, first match wins:
   1. the first line of a quoted snippet
   2. the definition of the named function, method or class
   3. the declaration of the named variable
   4. the import of the named module
   5. the first occurrence of the identifier
4. Side: `addition` when the line exists in the current file; `deletion` when the comment is about removed code and you found it in the old side of the diff.
5. Nothing matches ("this component is too complex"): leave it file-level, with no `<line>`.
