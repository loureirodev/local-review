# XML format — mapping, assembly, validation, and report

This reference covers the shared steps that follow fetching from GitHub or GitLab:
general-comment resolution, XML mapping, assembly, XSD validation, and the write + report.

## Handle `--last-comment` flag

If `--last-comment` was given:
- Combine all fetched comments into a single list.
- Sort by `created_at` descending.
- Keep only the single most recent comment.
- All further steps apply to that one comment only.

## Map comments to ReviewComment entries

**Inline comment** (GitHub review comment / GitLab diff note with a `position` object):

```xml
<comment id="<forge>-<id>">
  <file><path></file>
  <line number="<line-number>" side="<addition|deletion>" />
  <body><escaped-body></body>
  <created-at><iso-datetime></created-at>
  <url><permalink-to-original-comment></url>   <!-- forge imports only -->
</comment>
```

**General comment** (no file/line attachment):

1. Run `git ls-files` in the current directory to get all tracked paths.
2. Scan the comment body for file path mentions (backtick-quoted paths, "in `file.ts`",
   function names followed by a filename, etc.).
3. For each mention that fuzzy-matches a tracked path (substring or basename match),
   produce one `<comment>` attached to that file.
4. **Resolve to a specific line** whenever possible — see
   [line-resolution.md](line-resolution.md) for the full algorithm. Read the
   target file and search for referenced code (function names, variables,
   snippets) to determine the exact line number.
5. If no file reference can be resolved, produce one `<comment>` with
   `<file>_discussion</file>` (no `<line>` element).

All text content must be XML-escaped: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`.

## Assemble the XML document

Group all comments by their `<file>` path. For each unique path, create a
`<file path="..." viewed="false">` element with comments in chronological order.
The `_discussion` bucket, if present, goes last.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<review>
  <timestamp><current-ISO-datetime></timestamp>
  <source type="github-pr" owner="<owner>" repo="<repo>" pr="<number>" />
  <!-- OR: <source type="gitlab-mr" project="<project>" mr="<number>" /> -->
  <!-- OR: <source type="agent" /> -->
  <files>
    <file path="<path>" viewed="false">
      <comment id="gh-123">
        <file>src/foo.ts</file>
        <line number="42" side="addition" />   <!-- omit for file-level comments -->
        <body>Rename this variable.</body>
        <created-at>2024-01-15T10:30:00Z</created-at>
        <url>https://github.com/owner/repo/pull/1#discussion_r123</url>  <!-- optional -->
      </comment>
    </file>
    <!-- ... -->
    <file path="_discussion" viewed="false">   <!-- general comments, if any -->
      ...
    </file>
  </files>
</review>
```

## Validate before writing

Cross-check the generated XML against [../assets/review.xsd](../assets/review.xsd):

- Root element is `<review>`.
- `<timestamp>` present and non-empty.
- `<source>` has a valid `type` attribute (`local`, `github-pr`, `gitlab-mr`, or `agent`).
- `type="github-pr"`: `owner`, `repo`, and `pr` (integer) are present.
- `type="gitlab-mr"`: `project` and `mr` (integer) are present.
- `type="agent"`: `agent` is optional (string).
- Each `<comment>` has `id` attribute plus `<file>`, `<body>`, `<created-at>` children.
- `<url>` is optional; when present it must be a valid URL.
- `<line>` when present has `number` (positive integer) and `side` (`"addition"` or `"deletion"`).
- `viewed` on `<file>` is `"true"` or `"false"`.

Fix any structural error before writing.

## Write and report

Write the XML to the path given by `--output` (default: `./review.xml`).

Print:

```
Import complete — review.xml written to <output-path>

  Source:         GitHub PR #<number> (<owner>/<repo>)
                  -- or --
                  GitLab MR !<number> (<project>)
  Total comments: <N>
  Inline (line):  <N>
  File-level:     <N>
  Unresolved:     <N>  (stored under _discussion)

To view in local-review:
  bun run preview -- --output-file <output-path>
  -- or --
  Open local-review and load the file from the UI.
```
