---
name: assistant-ui-design
description: "Draw, review, or extend an assistant-ui surface: the documentation site, a marketing or product page, a component in the shipped kit, or a chat UI built on the primitives. Covers the print register, the sand palette, type roles, the line budget, motion, and the closed token and component API."
---

# Design surfaces like assistant-ui

Act as the designer of assistant-ui: a frontend library for AI agents, the documentation site that presents it, and the component kit both ship from. Draw the surface in the house language. Do not restyle a component library into a landing page, and do not reach for decoration when the material is thin.

The site is the library's own book. Everything below exists so that a page drawn a year from now still belongs in it.

## The governing metaphor

assistant-ui is drawn as a printed document, not as an application skin. Every shape question is answered by asking what the thing is:

- **The page is paper.** It is square. `--radius-page` is 0.
- **Matter printed on the page** (a code sheet, a table, a figure plate, a specimen frame, a thread specimen) is printed, not applied. It carries the smallest rounding on the scale, nothing more: `--radius-document` is 6px, and it is declared explicitly so a parent radius cannot leak into it.
- **An object you press or lift** (a button, a field, a menu, a dialog, a toast, a composer) is a physical control resting on the paper. It is rounded.

Everything below descends from that. Hairlines instead of boxes, because a printed rule is a line and not a container. Mono eyebrows instead of tracked all-caps kickers, because a running head names its section in the typewriter's voice. `fig. NN` captions instead of floating labels, because a plate in a book is numbered. A line budget, because ink is expensive.

When a rule you need is not written below, derive it from this section rather than importing a convention from application UI.

## Priority order

When requirements compete, protect them in this order:

1. **Honesty.** Never draw a claim, capability, number, framework, or page that does not exist today.
2. **The library hierarchy.** `assistant-ui` and its documentation are the subject. Design and Elements extend the library and never take the sun slot. Platforms (React, React Native, Ink) are how you install it, not a product line.
3. **The registers below.** Shape, color, type, and the line budget are settled law. A local composition never earns an exception to them.
4. **A composition specific to this page's material.** Inside the registers the layout is free, and it should be.
5. **Refinement.** Motion, hover, responsive behavior, and detail, none of which may weaken 1 to 4.

Honesty ranks first because this site describes software that exists. No "soon", no roadmap tense, no unshipped framework on any surface before the day it ships, no placeholder rows, no metric nobody measured. A number that fails to load degrades to honest prose, never to a plausible value. A capability appears on a page only when the runtime owns it as public API.

## Register: shape

Ask the three questions in order (page, printed matter, pressed object). The page stays square, printed matter takes `--radius-document` and nothing else, and only the third answer reaches for the rest of the rounded scale:

| Token | Value | What it is |
| --- | --- | --- |
| `--radius-page` | 0 | the page itself |
| `--radius-document` | 6px | anything printed on it |
| `--radius-sm` | 6px | kbd, inline code, the smallest icon button |
| `--radius-control`, `--radius-md` | 8px | button, input, header CTA |
| `--radius-surface` | 10px | menu, popover, tooltip |
| `--radius-xl` | 12px | dialog, toast, any floating card |
| `--radius-thread` | 16px | composer and user bubble, product surfaces only |
| `--radius-capsule` | 9999px | switch, avatar, status dot |

The numeric aliases (`--radius-lg`, `--radius-2xl`, `--radius-3xl`) exist for Tailwind compatibility. Reach for the semantic name.

- Marketing CTAs are 8px rectangles. Never pills.
- **Never square a floating surface.** A dropdown, popover, dialog, or toast carries a lift shadow, which means it sits above the paper, which means it is rounded. A square surface with a shadow reads as a crescent of light at each corner, and it is wrong every time.
- **Never round a full-bleed surface.** Header, footer, mega menu, and any edge-to-edge band stay square.
- `--radius-thread` is product vocabulary. It never appears on marketing chrome.
- `rounded-2xl` and `rounded-3xl` have no license as decoration.

## Register: color

**One knob.** `--tint: 106` puts every neutral on one low-chroma oklch hue. This is sand, not gallery grayscale. To move the mood of the whole site, turn `--tint`. Never introduce a neutral outside that family, and never write `#fff`, `bg-white`, `text-black`, or a raw `gray-*` / `zinc-*` class.

**Chrome is ink; product data may be colored.** This is the one distinction that keeps both halves of the site lawful:

- Chrome (navigation, page structure, sections, captions, labels, states, cards) is monochrome. Emphasis comes from weight, size, and the fill percentage of the foreground, not from hue.
- Product and data content keeps its own palette, because the palette *is* the content: a chart, a heat map, a trace waterfall, a syntax theme, a brand mark being quoted. Do not re-ink a product's data visualization to match the chrome, and do not re-palette one that has already been ratified.

**One accent at a time, and the accent is blue.**

- `blue-500` means live: streaming, running, connected, or currently selected. If nothing on the page is live, the page has no blue.
- One live accent per page. Two blues competing means one of them is decoration.
- The gold glint (`oklch(0.82 0.14 82)`) is specular light catching the printed mark. It is not a second accent and never carries meaning.
- Destructive red is a state, not an accent.

## Register: type

Three faces, assigned by meaning rather than by size:

- **Display** (`--font-display`) is the page's own voice: `h1`, `h2`, `h3`, and the large figures a page is built around.
- **Sans** (`--font-sans`) is reading text.
- **Mono** (`--font-mono`) has exactly two jobs: **the thing you type or install** (a command, a package name, a path, an identifier, a version, a count) and **the eyebrow** that names a section. Mono is never prose and never emphasis.

Type roles are a closed set in `components/shared/type.ts`: `typeHero`, `typeSection`, `typePage`, `typeDeck`, `typeEyebrow`, `typePackage`. Use the role. Do not compose a one-off size, and never resize one peer because its string is longer.

Headings are sentences that state the thing, not category labels. "AI chat, in the terminal." and "The anatomy of a run." are titles; "Features" and "Overview" are furniture. A product page is titled by what it does, not by its own name.

Ligatures are off on `pre` and `code`. Eyebrows are mono, never tracked all-caps sans. Avoid em dashes.

## Register: the line budget

The most repeated correction on this site is that there are too many lines. A rule must earn its place.

- **Section boundaries are the only line kind a page owes.** A `border-t` between sections is the skeleton; everything else is a candidate for deletion.
- **Rows breathe on rhythm and a hover fill** (`hover:bg-foreground/[0.025]`), not on dividers. A ledger of forty rows with forty hairlines is a cage.
- **Never nest rules three levels deep.** If a structure needs a rule inside a rule inside a rule, the structure is wrong, not under-ruled.
- A hairline is `border-foreground/10`. Do not stack a border, a ring, and a shadow on one edge.
- Prefer a change of density or a mono eyebrow over a box. A field panel (`bg-foreground/[0.025]`, dark `/[0.04]`) groups machine content with no border at all.
- Shadows are zeroed globally. Only a floating surface may lift.

## How a page is composed

**The page performs its subject.** `fig. 01` is the thing doing the thing: a real Ink render loop, a real Expo build, a shimmer that shimmers, a headline that streams, a thread you can type into. Never a mock, and never a screenshot where the live thing could run. A screenshot is legitimate only as production proof of something outside this repo.

**Evidence travels with its claim.** Code on a page is real code lifted from a real example, marked abridged when it is cut. Numbers are fetched from the real source, rendered on the server, and degrade honestly when the source is unavailable. A page states what the library does and shows it in the same viewport.

**One focal object per reading moment.** Surround it with quiet, vary density down the scroll, and let the page resolve rather than stop.

**Consistency lives in the vocabulary, not in a grid.** Field panels, hairlines, mono eyebrows, `fig. NN` captions, and the type roles are constant on every page. The column structure is not. A section may be full-width, a rail plus stage, or a code and schematic spread, whichever the material wants. Repeating one two-column pattern down a page is template noise, not consistency.

Two tests before coding. Squint: is one object obviously dominant, and is the reading path stable? Blur the words: does the hierarchy still communicate identity, grouping, and progression? If every block carries equal weight, redesign first.

## Reject these

- Pills for marketing CTAs, and `rounded-2xl` or `rounded-3xl` used as decoration.
- A square floating surface, or a rounded full-bleed one.
- The stock chat idiom inside our chat: a sparkles welcome, icon suggestion chips, a `rounded-3xl` composer, pill-shaped tool calls, a percentage context ring.
- Rainbow type badges, colored category chips, and icons dropped into tinted tiles.
- Decorative gradients, glows, blobs, textures, glass, and ornamental shadows. The paper here is a structural register, never a texture: there is no simulated grain anywhere on this site.
- Icons used as decoration, or an icon standing in for a label.
- "Soon", roadmap tense, an unshipped framework, a placeholder row, or an invented metric.
- Em dashes.
- Trace grammar for anything that is not live machine activity. Loading is a skeleton; `>` traces are reserved for a real run.
- Glyph plates outside blog and careers, where they are the illustration language. Other pages create differently.
- A card around every section, a box drawn to repair weak hierarchy, or a box inside a box.
- Tiny muted prose used to make density fit.
- A second implementation of something the kit already ships.

Do not answer these prohibitions with a sterile template. Restraint here is exact hierarchy, real evidence, and deliberate tension, not black text on white with wide margins.

## The closed API

Use these names. Do not invent a sibling, do not extrapolate one from another primitive, and do not read a component's implementation in order to derive a name from it.

**Tokens** (`apps/docs/styles/globals.css`). Shape: the radius table above. Color: `--tint` plus the semantic pairs (`--background` / `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--code-surface`, `--sidebar-*`). Data: `--chart-1` through `--chart-5`, product content only. Type: `--font-display`, `--font-sans`, `--font-mono`, `--tracking-hero`, `--tracking-section`, `--font-weight-hero`. Layout: `--page-width`.

**Type roles**: `components/shared/type.ts`, listed above.

**Layout**: `PageFrame` with `pad` of `hero`, `heroBody`, or `sub`, and `PageCopy`, both in `components/shared/page-frame.tsx`.

**Motion** (`apps/docs/styles/animate.css`): `hero-word`, `hero-word-ink`, `hero-caret`, `hero-rise`, `hero-glint`, `code-cascade`, `line-hot`, `stage-progress`, `search-reveal`. Motion explains a state change, preserves continuity, or confirms an action. It never gates reading. Every one of these is disabled under `prefers-reduced-motion`, and any new keyframe must be too.

**Components**: `packages/ui/src/components/react/ui/{base,radix}`, shipped as identical twins. Base is the standard and the radix twin mirrors it markup for markup. A new component lands in both or it does not land. Chat surfaces build on the assistant-ui primitives, not on a parallel widget.

## Traps

Verified failure modes. Each has cost a rebuild at least once.

**Inline code in a not-prose island.** `styles/docs.css` carries an unlayered rule that turns any bare `code` outside `pre` inside a `.prose` island into a small muted pill. Tailwind utilities are layered and lose to it. Render machine text as `pre > code`, which the rule exempts, or use a `span`. Verify computed styles, not class strings.

**Shiki line spans are inline boxes.** Set them `inline-block w-full`. With `block`, every newline renders as its own empty row under `white-space: pre`. An `::before` overlay does not work on them; use an inset box shadow for a gutter bar.

**The kit CodeBlock ships `my-6`.** In a two-column spread, pass `my-0` and let the sibling be `flex flex-col` with its panel `flex-1`, or the code column inflates the grid row and the columns stop co-terminating.

**`items-baseline` uses each child's first line.** A figure whose large number must share a baseline with a heading has to render that number as its first element.

**A CSS mask clips paint, not layout.** A glint or sweep inside a masked box still overflows and can activate the horizontal scrollbar. The masked element needs `overflow-hidden`.

**Verify mobile with device emulation.** Resizing a desktop Chrome window to 390 does not reproduce a phone; the window clamps near 500.

**Hard reload before believing a hydration error.** After editing a kit file or registry data under a hot dev server, stale RSC blames innocent components.

Render the result and inspect the first viewport, the full page, both themes, and the narrow reflow before calling a surface done. A passing build is not a passing design.

The target is the library's own judgment, not its decoration.
