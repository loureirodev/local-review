# Action: open

Launches the local-review web UI in the browser so the user can review a diff
interactively. By default the UI starts clean. Pass `--existing` to load a
previously saved review.xml into the UI (comments + viewed state).

---

## Step 1 — Resolve the review.xml path

- Default: `./review.xml` in the current working directory.
- If the user passed `--input <path>`, use that path instead.

---

## Step 2 — Verify git repository

The server requires a git repo. Check:

```bash
git rev-parse --show-toplevel
```

If it fails, report the error and stop.

---

## Step 3 — Run the server

Clean session (default):

```bash
local-review --output-file <review-xml-path>
```

Load existing review.xml into the UI on startup:

```bash
local-review --output-file <review-xml-path> --existing
```

With a custom port:

```bash
local-review --output-file <review-xml-path> --existing --port <port>
```

The browser opens automatically. The server prints its URL on startup.

Tell the user:
- The URL (e.g. `http://localhost:XXXXX`)
- Where exports will be saved (`<review-xml-path>`)
- Whether comments were loaded from an existing file (if `--existing` was used)
- How to stop: `Ctrl+C`

---

## Typical follow-up after `import`

1. `import <URL>` → writes review.xml with PR/MR comments
2. `open` → launches the UI to review the diff interactively
3. `apply` → Claude implements the actionable comments as code changes
