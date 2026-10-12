# XML format — assemble and validate a review

Step 5 of [import.md](import.md). The schema is [../assets/review.xsd](../assets/review.xsd); this file is how to fill it.

## Document

```xml
<?xml version="1.0" encoding="UTF-8"?>
<review>
  <timestamp>2024-01-15T10:30:00Z</timestamp>
  <source type="github-pr" owner="o" repo="r" pr="1" base="main" head="feat/x" commit="3f2a9c1e8b7d6a5f4e3d2c1b0a9f8e7d6c5b4a39" />
  <!-- <walkthrough>, when present, goes here: see walkthrough.md -->
  <files>
    <file path="src/foo.ts" viewed="false">
      <comment id="gh-123">
        <file>src/foo.ts</file>
        <line number="42" side="addition" />   <!-- omitted on file-level comments -->
        <body>Rename this variable.</body>
        <created-at>2024-01-15T10:30:00Z</created-at>
        <url>https://github.com/o/r/pull/1#discussion_r123</url>   <!-- forges only -->
      </comment>
    </file>
    <file path="_discussion" viewed="false">   <!-- last, only if any comment landed here -->
      …
    </file>
  </files>
</review>
```

- One `<file>` per distinct path, `viewed="false"`, comments in `createdAt` order. `_discussion` goes last.
- Escape every text node and attribute value: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`. No CDATA.
- `<source>` takes the attributes its source reference gives, always with `head` and `commit` when known. The attributes each `type` requires are listed in the schema's header comment.

## Validate

```bash
xmllint --noout --schema <skill-dir>/assets/review.xsd <review-file>
```

Without `xmllint`, check by hand against the schema: every `<comment>` has `id`, `<file>`, `<body>`, `<created-at>`; `<line number>` is a positive integer with `side` `addition`/`deletion`; `<url>` is absolute. Done when it validates with no error.
