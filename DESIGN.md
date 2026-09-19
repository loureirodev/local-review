# Design

`local-review` is a git diff you read. Everything here serves that: the code is
the content, the interface is the margin around it.

It shares a visual identity with [`openspec-ui`](https://github.com/) — two
local, terminal-launched tools used in the same workflow, so they should look
like the same family. The shared part is the substrate: **paper and ink**. A
warm cream ground, a warm near-black ink, hairlines instead of cards, colour
roles in OKLCH, the same typography, the same icon drawing rules. What is *not*
shared is the accent and the brand — see [Convergence and
divergence](#convergence-and-divergence).

This file is the reference. Consult it before a visual change, and update it
when a visual decision is made.

## Colour

Colours are named by **role**, never by value. A component asks for `--muted`,
not for "grey 500". Two things follow: the theme swap is a token swap, and there
is no per-component judgement about which grey.

Tokens live in `src/web/styles/index.css` inside Tailwind v4's `@theme`, so each
role generates the usual utilities — `bg-panel`, `text-muted`, `border-hair`.
Tailwind prefixes them, so the token is `--color-muted` and the class is
`text-muted`.

| role | class | light | dark | what it is |
|---|---|---|---|---|
| `--color-bg` | `bg-bg` | `oklch(96.5% 0.014 85)` | `oklch(20% 0.012 80)` | the page ground — the paper |
| `--color-panel` | `bg-panel` | `oklch(94% 0.016 85)` | `oklch(24% 0.012 80)` | a surface lifted off the ground: toolbar, popover, comment |
| `--color-track` | `bg-track` | `oklch(88% 0.018 85)` | `oklch(30% 0.012 80)` | an inset well: segmented controls, progress troughs, hover |
| `--color-hair` | `border-hair` | `oklch(90% 0.016 82)` | `oklch(28% 0.012 80)` | every rule and border in the app |
| `--color-text` | `text-text` | `oklch(26% 0.02 70)` | `oklch(94% 0.008 80)` | the ink — primary content |
| `--color-muted` | `text-muted` | `oklch(48% 0.02 72)` | `oklch(72% 0.011 80)` | secondary text, idle icons |
| `--color-faint` | `text-faint` | `oklch(62% 0.018 75)` | `oklch(56% 0.012 80)` | separators, timestamps, placeholders |
| `--color-accent` | `bg-accent` | `oklch(66% 0.1 205)` | `oklch(74% 0.1 205)` | interactive and primary actions |
| `--color-accent-tint` | `bg-accent-tint` | `oklch(92% 0.04 205)` | `oklch(33% 0.07 205)` | the accent as a background wash |
| `--color-accent-fg` | `text-accent-fg` | `oklch(26% 0.02 70)` | `oklch(20% 0.012 80)` | ink set on an accent fill |
| `--color-success` | `text-success` | `oklch(52% 0.14 150)` | `oklch(76% 0.14 150)` | added lines, added files, viewed |
| `--color-warning` | `text-warning` | `oklch(56% 0.13 85)` | `oklch(80% 0.13 85)` | modified files, "(edited)" |
| `--color-danger` | `text-danger` | `oklch(53% 0.19 25)` | `oklch(72% 0.16 25)` | removed lines, deleted files, errors, destructive hover |
| `--color-renamed` | `text-renamed` | `oklch(50% 0.16 300)` | `oklch(74% 0.14 300)` | renamed files |
| `--color-brand` | `text-brand` | `oklch(58% 0.12 255)` | *(same)* | the brand mark, and nothing else |

Neutrals are copied verbatim from `openspec-ui` — that is what makes the two
apps read as the same paper. The hues are warm on purpose: `85`/`80` on the
surfaces, `70`–`75` on the ink. A cold grey next to this cream reads as dirty.

### Hue separation

The semantic hues are spread so no two can be confused at a glance:

```
   danger 25 ── warning 85 ── success 150 ── accent 205 ──── renamed 300
        └── 60° ──┘    └─ 65° ─┘    └─ 55° ─┘     └── 95° ──┘
```

The accent is a **teal at hue 205** — the same hue as `openspec-ui`'s, chosen
for taste, not for family resemblance. It sits 95° from `--renamed`, which
shares the file tree with it, so the renamed status never reads as
"clickable"; and 55° from `--success`, far enough that a viewed toggle and a
selected row stay distinct. The dark value is the one asked for,
`oklch(74% 0.1 205)`; the light value keeps the hue and chroma at 66%.

Ink on an accent fill is **always dark**, through `--accent-fg` — never
`text-bg`. Cream on teal reads washed at any lightness the teal can take while
still working as a fill on cream; dark ink on a 66–74% teal clears 5:1 in both
themes. The one place the accent used to be *text* — the comment-count badge
in the file tree — is now a filled badge for the same reason.

### `--brand` is reserved

`--brand` is **not a semantic role**. It is theme-invariant, it is reserved for
the brand mark, and it **MUST NOT encode state** — a brand colour that also
means something turns every future rebrand into a bug hunt.

There is no logotype yet. The value above is provisional, chosen only for
separation: it sits in the widest gap in the hue circle (`205`→`300`, midpoint
`~255`) and well away from `openspec-ui`'s terracotta, because the brands are
meant to differ even though the paper does not. It moved from 200 when the
accent moved to 205 — a brand mark the same colour as every button is not a
mark. Adopting a real logotype is a
change to that **one line** and this one paragraph.

Because Tailwind drops `@theme` variables nothing references, `--color-brand` is
declared in a `@theme static` block. A reserved token that vanishes from the
build is not reserved.

## Themes

Three states, resolved in this order:

1. **`--theme <light|dark>` on the CLI** — wins for the session, and is not
   written to disk. Set on the invocation, gone on the next one.
2. **The stored preference** — `theme` in the settings file, `light`, `dark` or
   `system`, set by the toolbar toggle.
3. **`prefers-color-scheme`** — what `system` means, tracked live.

The flag travels beside the stored preference, never in place of it:
`GET /api/settings` returns it as a separate `sessionTheme`, and the client
shadows the stored value with it rather than overwriting it. Folding the two
together would make a session-only flag permanent the first time the reviewer
touched the toggle. Toggling clears the shadow — an explicit choice outranks the
flag, and only an explicit choice is ever written.

The resolved override is mirrored onto `<html data-theme>`, and the CSS is
written so that its *absence* is the "follow the environment" state:

```css
:root { /* light — also the forced-light case */ }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* dark */ } }
:root[data-theme="dark"] { /* dark, forced */ }
```

The two dark blocks are duplicated by necessity and **MUST be kept in sync**;
both carry a comment saying so.

### Reaching the shadow DOM

Two surfaces live in a shadow root: the file tree (`@pierre/trees`) and the diff
(`@pierre/diffs`). They are reached differently, and the difference matters:

- **CSS custom properties are inherited properties, and inheritance crosses the
  shadow boundary.** So every `--trees-*-override` and `--diffs-*-override` is
  pointed at a role token *once*, as a `var()` reference, and retints itself on
  a theme change with no React involvement.
- **`themeType` on `CodeView` is a JavaScript value, not a selector.** Only this
  one needs the theme as React state, which is what `useTheme()` returns.

There is one thing to be careful about. Changing `CodeView`'s `unsafeCSS` resets
every item's layout, while changing `theme`/`themeType` only invalidates the
element pool. So **no theme-derived value may be interpolated into
`unsafeCSS`** — write `var(--color-success)` into a constant string and let CSS
do the work, or a theme toggle will re-measure the whole diff.

Both shadow roots also need `color-scheme` to follow the resolved theme, not the
OS, or their internal `light-dark()` calls ignore a forced theme. `:root` sets it
per theme; the tree's `:host` inherits it.

### Syntax highlighting

`THEME` in `src/web/components/diff/constants.ts` is the single place a
highlighting theme is named:

```ts
export const THEME = { dark: "kanagawa-dragon", light: "solarized-light" };
```

Both are chosen for their **ground**, because that is the one part of a
highlighting theme that has to agree with the page:

| | ground | vs `--bg` |
|---|---|---|
| `solarized-light` | `#fdf6e3` = `oklch(97.4% 0.026 90)` | `oklch(96.5% 0.014 85)` — 0.9 pp lighter, 5° of hue apart |
| `kanagawa-dragon` | `#181616` = `oklch(20.3% 0.003 17)` | `oklch(20% 0.012 80)` — 0.3 pp apart, both near-neutral |

A white-ground light theme (chroma 0, cold) shows a visible seam against cream;
a dark theme a few points off in lightness reads as a patch pasted on the page.

The added/removed tints do **not** come from the highlighting theme. They are
set from `--success` and `--danger` via
`--diffs-addition-color-override` / `--diffs-deletion-color-override`, which sit
above the library's whole fallback chain. The library mixes each with the diff
ground itself, so both themes stay calibrated. **The tokens always win.**

## Typography

| role | stack | used for |
|---|---|---|
| `--font-body` | Lexend, system sans | **everything** |
| `--font-mono` | JetBrains Mono | the diff's code, and nothing else |

Both come from the Google Fonts CDN, as `openspec-ui` does — this is a local
developer tool, not a page with a loading budget. Offline, the fallback stacks
keep it usable.

There is **no display face**. `openspec-ui` uses Fraunces for headings;
`local-review` has no headings. Its largest text is a filename.

The split is by **role, not by content**. Monospace means "this is the code you
are reviewing". A file path in the tree, a filename in a header, a line
reference in a comment and a timestamp are all *about* the code without being
code, so they are set in the UI face like everything else. Only line numbers and
the code itself are mono, and they are mono because column alignment is load
bearing there and nowhere else.

The one place this is enforced rather than chosen is the diff: `--diffs-font-family`
is mono and `--diffs-header-font-family` is the UI face, both set in
`DiffViewer`'s `unsafeCSS`.

## Buttons

Every button is one of the shapes defined in `src/web/components/Button.tsx`.
Before that existed each call site invented its own padding, radius and hover,
so "Cancel" and "Comment" read as two different kinds of control, and the
settings trigger did not match the theme toggle sitting next to it. **A raw
`<button>` outside `Button.tsx` is a bug**: if a control needs a shape that is
not here, the shape is added here, with its row in this table.

| | shape | when |
|---|---|---|
| `<Button>` | `px-2.5 py-1`, `text-xs`, `font-medium`, `rounded-md`, `bg-track` → `hover:bg-hair` | the default; every labelled action |
| `<Button variant="primary">` | same shape, `bg-accent` with `text-accent-fg` | the **one** action a surface exists to perform — submitting a comment |
| `<Button variant="success">` | same shape, `bg-success/18` on `text-success` | the on-state of a toggle that records completion — a file marked viewed |
| `<IconButton>` | `size-8` square (`compact` → `size-6`), `rounded-md`, `text-muted` → `hover:text-text hover:bg-track` | a button whose whole content is one icon |
| `<IconButton filled>` | same square, with the neutral `bg-track` → `hover:bg-hair` fill at rest | an icon button that must be findable without hovering — adding a comment, in the file header and in the gutter |
| `<SegmentedControl>` | a `bg-track` well; each option `px-2.5 py-1 text-xs font-medium`, the selected one lifted to `bg-bg` | exactly one of a few options — the diff mode, the diff layout |
| `<ToggleRow>` | a full-width settings row that is the button, with a `.toggle-switch` on the right | an on/off setting in the popover |
| `<LinkButton>` | text only, `text-muted` → `hover:text-text`, no shape | an action set inside a line of metadata that already has a shape — "Collapse all" in the tree footer |

`IconButton` takes `active` for a trigger whose surface is open (it reads held
down, not merely hovered) and `tone="danger"` for a destructive hover — the only
colour an icon button may take on.

A button never contains a text character standing in for a glyph. `+`, `−` and
`×` are `PlusIcon`, `MinusIcon` and `CloseIcon`.

### Buttons in the diff header and gutter

The diff's header controls (`HeaderControls.tsx`) and its gutter add-comment
button are handed to `CodeView` as **slotted content**: React renders them in
the light DOM as children of `<diffs-container>`, and the library projects them
through a `<slot>`. Slotted nodes keep the document's stylesheets, so they use
`Button.tsx` and Tailwind utilities like everything else — there is no second
copy of the vocabulary.

This was got wrong once. An earlier revision assumed the controls were portalled
*inside* the shadow root and restated the vocabulary as CSS injected through
`unsafeCSS`. Shadow styles cannot reach slotted light-DOM nodes, so the header
controls rendered as bare `<button>`s (the viewed toggle looked like a link) and
the gutter `+` had no shape at all. The lesson: **check where a node actually
lives before choosing how to style it** — `getComputedStyle` on the rendered
button, not a reading of the library's docs.

What `unsafeCSS` *is* for is the shadow root's own surfaces: the code font, the
header font, the added/removed tints, the header and separator sizes.

## Icons

`src/web/components/icons.tsx`. The rules are shared with `openspec-ui` — the
rules, not the files, because the vocabularies barely overlap (`openspec-ui`
draws *states*, `local-review` draws *actions*).

- 24×24 grid
- `strokeWidth` 1.5, `strokeLinecap` and `strokeLinejoin` round
- `currentColor` only — an icon never carries a colour of its own
- `fill="none"`, `aria-hidden="true"`; the control around it carries the label
- no text characters standing in for glyphs

Render size is a constant, not a per-call-site decision:

- **`ICON_SIZE` (20px)** — the default. 24×24 at 20px is an effective 1.25px
  stroke, the same optical weight as `openspec-ui`. Used for standalone icon
  buttons.
- **`ICON_SIZE_INLINE` (14px)** — icons set *inside a line of text* at 11–12px:
  the branch label, the export button, comment metadata, settings rows. Same
  grid, same stroke, smaller render.

The second size is a divergence from `openspec-ui`, which renders everything at
20. It exists because this app sets icons inline with 11px monospace far more
often, where a 20px glyph towers over the text it labels. The rule is *the icon
sizes to what it sits beside*, and there are exactly two answers.

One exception, deliberate:

- **Brand marks** (`GitHubIcon`, `GitLabIcon`) are other people's logotypes.
  Fixed geometry, filled, their own grid. Only the render size is shared.

## What the font-size control moves

The font-size and line-height settings move **the code, and only the code**.

Everything else — the file tree, diff file headers, hunk separators, the
toolbar, comments — keeps a fixed size. Reading a diff at 16px does not mean
wanting a 16px file tree; it means wanting the code bigger. Scaling the chrome
alongside it costs sidebar width and header room for no gain.

Two places enforce this:

- the file tree pins `--trees-font-size-override` to **12px**, deliberately
  compact so more of a long path fits in the sidebar;
- `[data-diffs-header]` and `[data-separator]` pin their own `font-size`, because
  `--diffs-font-size` is set on `:host` and would otherwise be inherited by the
  chrome as well. Pinned on the leaves rather than by scoping the variable,
  since the row-layout maths reads it from `:host`.

## Surfaces and elevation

Hairlines, not cards. A `--hair` rule separates regions; a `--panel` fill lifts
a surface off the ground. There is **no elevation scale**.

Shadows are a **closed set of four exceptions**, all of them things that float
over arbitrary content and need to be readable against anything underneath:

1. the gutter add-comment button
2. the comment input overlay
3. the settings popover
4. the file comments drawer

They use `.shadow-float` and `.shadow-float-lg`, defined from a per-theme
`--shadow-float` token. The two themes need genuinely different values: on the
dark ground a black shadow reads, and on cream the same shadow is invisible, so
the light theme uses the warm ink at low alpha instead. A shadow calibrated on
one ground and reused on the other simply disappears.

Adding a fifth shadow means adding it to that list, here, with its reason.

Two corner radii, and the step between them carries meaning: `rounded-md` (8px)
is a control — a button, an input, an inline panel — and `rounded-lg` (12px) is
a surface floating over the page. Tailwind's own `lg` default is also 8px, so
`--radius-lg` is set explicitly; left alone, the two would be identical and the
distinction would exist only in the class names.

## The accent, and comments

Comments are why this tool exists, and until this system they were grey on grey
— the "Comment" button was indistinguishable from "Cancel" except by its
background. The accent now carries them:

- the comment submit button (the only `variant="primary"` in the app)
- the file-level comment badge, once it has a count
- comment-count badges in the file tree
- the selected row in the file tree, and the navigation flash, both as
  `--accent-tint`

Everything else — the export button, the mode selector, the settings rows — is
neutral. This is the heaviest accent load in the app, and it is the one the
tool's purpose earns.

The two *add*-comment controls — the file header's and the gutter's — are
deliberately not accented. They are the same `IconButton filled` so they read
as one control in two places; the gutter one adds `shadow-float` because it
floats over code. The accent is for the comment once it exists, not for the
invitation to write one.

The viewed toggle animates its state change: the ring fills and the check
scales in over 300ms rather than swapping. A toggle that records progress
should feel like progress.

## Motion

Motion confirms, it does not decorate. 150–200ms, `ease-out` on the way in.
Colour and opacity transition; layout does not, except the sidebar collapse and
the drawer slide, which are the two places something genuinely moves. The
navigation flash respects `prefers-reduced-motion`.

## Settings persistence

Display settings live in a file on the machine, not in `localStorage`.

The server binds a **random port** on each launch, the origin includes the port,
and `localStorage` is partitioned by origin — so every launch got a fresh empty
store and nothing ever survived. The process that opened the browser has disk
access; the browser does not.

| OS | path |
|---|---|
| Linux | `$XDG_CONFIG_HOME/local-review/settings.json`, else `~/.config/…` |
| macOS | `~/.config/local-review/settings.json` |
| Windows | `%APPDATA%\local-review\settings.json` |

`~/.config` on macOS rather than `~/Library/Application Support` because this is
a terminal tool and its users expect to be able to edit the file by hand, the
way they can for `gh`, `bat` or `starship`.

Writes are `PATCH` per key, not `PUT` of the whole object, because several
instances run at once against one file. Each request takes an advisory lock
(`settings.json.lock`, created `wx`, reclaimed if stale), re-reads, merges and
writes through a temp file plus `rename`. The lock is what makes the merge hold:
`rename` alone makes each *write* atomic, but two processes can still both read
the old file first and the second one wins. Unknown keys are carried through
untouched.

Nothing here may prevent the app from running. An unwritable disk, a corrupt
file and an unreachable server all degrade to "this session works, it just won't
be restored".

Settings are **global, not per project** — font size and theme are preferences
of the person, not of the repository. The file's shape leaves room for a
`projects` section later without breaking older readers.

## Convergence and divergence

Every point where this system deliberately differs from `openspec-ui`:

| | `openspec-ui` | `local-review` | why |
|---|---|---|---|
| CSS engine | plain CSS + CSS Modules | **Tailwind v4, tokens in `@theme`** | the family resemblance is in the values and roles, not the engine. Migrating ~2,500 lines to change nothing on screen is not worth it. |
| display face | Fraunces | **none** | this app has no headings. Its largest text is a filename. |
| accent | teal, hue 205 | **teal, hue 205** | the one value shared by choice rather than by inheritance; 205 keeps 95° clear of `--renamed`, which shares the file tree with it. |
| brand | terracotta `#DD6E42` | **blue `oklch(58% 0.12 255)`**, provisional | the paper is shared, the mark is not. ~215° apart so the two tools are never mistaken for each other. |
| filled surfaces | one only (the scenario block); no cards | **a documented floating-surface rule** | this app has four surfaces that genuinely float over arbitrary content. Pretending otherwise would mean four undocumented exceptions instead of one rule. |
| shadows | exactly one (the tooltip) | **four, enumerated above** | same principle — a closed set with reasons, not an elevation scale. |
| icon render size | 20px | **20px, plus 14px inline** | this app sets icons inside 11–12px metadata far more often. |
| mono usage | code only | **code only** | converged: mono means "this is the code under review", nothing else. |
| theme persistence | not persisted | **persisted in a config file** | `openspec-ui` hit the same `localStorage` dead end and stopped there. This app has a server process with disk access. |

Everything not in that table is shared on purpose: the neutral ramp, the state
hues, `--renamed`, the typography stacks, the icon drawing rules, the
hairline-over-card preference, the theme resolution strategy, and the rule that
`--brand` is reserved and never semantic.

## Non-goals

- **No elevation vocabulary.** Four documented exceptions, not a scale.
- **No design-system package.** Two apps agreeing on values, each documenting
  its own.
- **No hot sync of settings between running instances.** Different windows for
  different projects; each keeping what is on its screen is more predictable
  than one changing under you.
- **No self-hosted fonts.** A local developer tool with a CDN and a fallback
  stack.
- **No per-project settings.** See above.
