# Agent Instructions

`CONTRIBUTING.md` is the source of truth for commands, tests, project structure, architecture, code style and commit conventions. Read it before starting work.

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: <agent name> <noreply@example.com>
```

## Before you change
- **Anything visual** — read `DESIGN.md` first (colour roles, themes, typography, icon rules, shadows) and update it when you make a visual decision.
- **The `review.xml` format, a CLI flag or a skill command** — `.claude/skills/local-review/` ships to users; update every file listed in `CONTRIBUTING.md` § "The `local-review` skill" in the same change.

## Done
`bun test`, `bun run typecheck` and `bun run lint` pass; after React changes, `bun run react-doctor` too.
