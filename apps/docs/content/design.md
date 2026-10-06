---
name: assistant-ui-design
description: "Draw, review, or extend an assistant-ui surface: the documentation site, a marketing or product page, a component in the shipped kit, or a chat UI built on the primitives. Covers the print register, the sand palette, type roles, copy, the line budget, motion, and the closed token and component API."
---

# Design surfaces like assistant-ui

assistant-ui is a frontend library for AI agents. This file is the design guide for its documentation site, its marketing and product pages, and the component kit they share. Follow it when you draw, review, or extend any of those surfaces, so that a page added later matches the pages that exist now.

Keep a component library looking like a component library and do not restyle it into a landing page. When a page has little material, keep the page short and do not add decoration to fill it.

## The governing metaphor

assistant-ui is drawn as a printed document. It is not styled as an application skin. To decide the shape of an element, identify which of three things it is:

- **The page.** The page is treated as paper and is square. `--radius-page` is 0.
- **Printed matter** (a code sheet, a table, a figure plate, a specimen frame, a thread specimen). It takes the smallest rounding on the scale, `--radius-document` (6px), declared explicitly so a parent radius cannot leak into it.
- **An object you press or lift** (a button, a field, a menu, a dialog, a toast, a composer). It is a control resting on the page, and it is rounded.

The other conventions follow from the same metaphor. Structure is drawn with hairlines where an application would draw boxes. Figures are captioned `fig. NN`, the way plates in a book are numbered. Lines are used sparingly, as described in the line budget.

When a rule you need is not written below, derive it from this section rather than importing a convention from application UI.

## Priority order

When requirements compete, protect them in this order:

1. **Honesty.** Never draw a claim, capability, number, framework, or page that does not exist today.
2. **The library hierarchy.** `assistant-ui` and its documentation are the subject. Design and Elements extend the library and never take the most prominent position on a page. Platforms (React, React Native, Ink) are ways to install the library and are not presented as a product line.
3. **The registers below.** Shape, color, type, copy, and the line budget are fixed. A local composition does not get an exception to them.
4. **A composition specific to this page's material.** Inside the registers the layout is free. Choose it to suit the material.
5. **Refinement.** Motion, hover, responsive behavior, and detail. None of these may weaken 1 to 4.

Honesty ranks first because this site describes software that exists. Do not write "soon" or use roadmap tense. Do not show an unshipped framework on any surface before the day it ships. Do not add a placeholder row or a metric nobody measured. When a number fails to load, the page falls back to prose without the number, never to a plausible value. A capability appears on a page only when the runtime owns it as public API.

## Register: shape

Ask in order whether the element is the page, printed matter, or a pressed object. The page stays square, printed matter takes `--radius-document` only, and a pressed object uses the rest of the rounded scale:

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
- **Never square a floating surface.** A dropdown, popover, dialog, or toast carries a lift shadow, so it sits above the page and is rounded. A square surface with a shadow shows a crescent of light at each corner.
- **Never round a full-bleed surface.** Header, footer, mega menu, and any edge-to-edge band stay square.
- `--radius-thread` is for product surfaces. It never appears on marketing chrome.
- Never use `rounded-2xl` or `rounded-3xl` as decoration.

## Register: color

**One hue for every neutral.** `--tint: 106` puts every neutral on one low-chroma oklch hue, which gives a sand tone where a default palette would give pure gray. To shift the mood of the whole site, change `--tint`. Never introduce a neutral outside that family, and never write `#fff`, `bg-white`, `text-black`, or a raw `gray-*` / `zinc-*` class.

**Chrome is monochrome; product data may be colored.**

- Chrome (navigation, page structure, sections, captions, labels, states, cards) is monochrome. Emphasis comes from weight, size, and the fill percentage of the foreground, never from hue.
- Product and data content keeps its own palette, because there the colors carry the content: a chart, a heat map, a trace waterfall, a syntax theme, a brand mark being quoted. Do not recolor a product's data visualization to match the chrome, and do not change the palette of one that has already been approved.

**One accent at a time, and the accent is blue.**

- `blue-500` means live: streaming, running, connected, or currently selected. If nothing on the page is live, the page has no blue.
- One live accent per page. If two blue elements compete, one of them is decoration; remove it.
- The gold glint (`oklch(0.82 0.14 82)`) is a highlight on the printed mark. It is not a second accent and never carries meaning.
- Destructive red marks a state. It is not an accent.

## Register: type

Three faces, assigned by meaning rather than by size:

- **Display** (`--font-display`) is for headings: `h1`, `h2`, `h3`, and the large figures a page is built around.
- **Sans** (`--font-sans`) is reading text.
- **Mono** (`--font-mono`) is only for **the thing you type or install** (a command, a package name, a path, an identifier, a version, a count). Never use mono for prose or for emphasis.

Type roles are a closed set in `components/shared/type.ts`: `typeHero`, `typeSection`, `typePage`, `typeDeck`, `typePackage`. Use the role. Do not compose a one-off size, and never resize one peer because its string is longer.

A heading states what the section is about. It is not a category label. "AI chat, in the terminal." and "The anatomy of a run." work as titles; "Features" and "Overview" do not. Title a product page by what the product does, not by its name.

Ligatures are off on `pre` and `code`. Avoid em dashes.

## Register: copy

Every string on a surface names a control, states a fact the reader needs for the decision in front of them, or says what happens next. Delete a string that does none of the three.

- **Chrome carries no slogans.** A dialog, form, menu, footer, toast, or empty state has no tagline, reassurance, or sign-off. "Your project. Your choice." under two options only repeats that there are two options.
- **An empty slot stays empty.** A footer with one button is finished. Never write a line to balance a layout.
- **No stacked fragments.** Short sentences repeated on one frame ("Your X. Your Y.", "No X. No Y. Just Z.") read as advertising. Write one plain sentence.
- **State the thing directly.** Drop the "not X, but Y" setup and write Y.
- **Never narrate the reader's freedom, feelings, or ease.** No "you're in control", "we've got you covered", "simply", "just", "seamlessly", "effortlessly".
- **Helper text states a consequence.** "Both paths end with the same code in your project." tells the reader something the options do not.
- **A control is labeled by what it does:** "Continue", "Copy command", "Open the guide".
- The short title style is for `h1`, `h2`, and `h3` on a page. Controls, dialogs, and helper text are written in plain sentences.

To test a string, remove it and reread the surface. If the reader can still decide and act, leave it out.

## Register: the line budget

The most repeated correction on this site is that there are too many lines. Add a line only when the page is harder to read without it.

- **Section boundaries are the only lines a page needs by default.** A `border-t` between sections is the base structure. Treat every other line as a candidate for deletion.
- **Rows are separated by spacing and a hover fill** (`hover:bg-foreground/[0.025]`), not by dividers. Do not put a hairline between every row of a long list.
- **Never nest rules three levels deep.** If a structure seems to need a rule inside a rule inside a rule, change the structure.
- A hairline is `border-foreground/10`. Do not stack a border, a ring, and a shadow on one edge.
- Prefer a change of density over a box. A field panel (`bg-foreground/[0.025]`, dark `/[0.04]`) groups machine content with no border at all.
- Shadows are zeroed globally. Only a floating surface has one.

## How a page is composed

**The page demonstrates its subject.** `fig. 01` is the real thing running: a real Ink render loop, a real Expo build, a shimmer that shimmers, a headline that streams, a thread you can type into. Never use a mock, and never use a screenshot where the live thing could run. Use a screenshot only as production proof of something outside this repo.

**Evidence sits next to its claim.** Code on a page is real code lifted from a real example, marked abridged when it is cut. Numbers are fetched from the real source, rendered on the server, and degrade honestly when the source is unavailable. A page states what the library does and shows it in the same viewport.

**One focal object per reading moment.** Leave space around it, vary density down the scroll, and give the page a deliberate ending.

**Consistency comes from the shared vocabulary, not from a fixed grid.** Field panels, hairlines, `fig. NN` captions, and the type roles are constant on every page. The column structure is not. A section may be full-width, a rail plus stage, or a code and schematic spread, whichever suits the material. Repeating one two-column pattern down a page makes it read as a template.

Two tests before coding. Squint: is one object obviously dominant, and is the reading path stable? Blur the words: does the hierarchy still communicate identity, grouping, and progression? If every block carries equal weight, redesign first.

## Reject these

- Pills for marketing CTAs, and `rounded-2xl` or `rounded-3xl` used as decoration.
- A square floating surface, or a rounded full-bleed one.
- The stock chat idiom inside our chat: a sparkles welcome, icon suggestion chips, a `rounded-3xl` composer, pill-shaped tool calls, a percentage context ring.
- Rainbow type badges, colored category chips, and icons dropped into tinted tiles.
- Decorative gradients, glows, blobs, textures, glass, and ornamental shadows. Paper is a structural idea here and is never drawn as a texture, so there is no simulated grain anywhere on this site.
- Icons used as decoration, or an icon standing in for a label.
- "Soon", roadmap tense, an unshipped framework, a placeholder row, or an invented metric.
- Em dashes.
- A tagline, reassurance, or sign-off in a dialog, form, footer, toast, or empty state, and any line written to fill a slot.
- Trace grammar for anything that is not live machine activity. Loading is a skeleton; `>` traces are reserved for a real run.
- Glyph plates outside blog and careers, where they are the illustration style. Other pages use other illustration.
- A card around every section, a box drawn to repair weak hierarchy, or a box inside a box.
- Tiny muted prose used to make density fit.
- A second implementation of something the kit already ships.

These prohibitions do not call for a bare template of black text on white with wide margins. A page still needs a clear hierarchy, real evidence, and a deliberate composition.

## The closed API

Use these names. Do not invent a sibling, do not extrapolate one from another primitive, and do not read a component's implementation in order to derive a name from it.

**Tokens** (`apps/docs/styles/globals.css`). Shape: the radius table above. Color: `--tint` plus the semantic pairs (`--background` / `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--code-surface`, `--sidebar-*`). Data: `--chart-1` through `--chart-5`, product content only. Type: `--font-display`, `--font-sans`, `--font-mono`, `--tracking-hero`, `--tracking-section`, `--font-weight-hero`. Layout: `--page-width`.

**Type roles**: `components/shared/type.ts`, listed above.

**Layout**: `PageFrame` with `pad` of `hero`, `heroBody`, or `sub`, and `PageCopy`, both in `components/shared/page-frame.tsx`.

**Motion** (`apps/docs/styles/animate.css`): `hero-word`, `hero-word-ink`, `hero-caret`, `hero-rise`, `hero-glint`, `code-cascade`, `line-hot`, `stage-progress`, `search-reveal`, and the `nav-glyph-*` keyframes selected by `[data-glyph-motion]`. Motion explains a state change, preserves continuity, or confirms an action. It never gates reading. Every one of these is disabled under `prefers-reduced-motion`, and any new keyframe must be too.

**Components**: `packages/ui/src/components/react/ui/{base,radix}`, shipped as identical twins. Base is the standard and the radix twin mirrors it markup for markup. A new component lands in both or it does not land. Chat surfaces build on the assistant-ui primitives, not on a parallel widget.

## Traps

Each of these failure modes has been verified, and each has caused a rebuild at least once.

**Inline code in a not-prose island.** `styles/docs.css` carries an unlayered rule that turns any bare `code` outside `pre` inside a `.prose` island into a small muted pill. Tailwind utilities are layered and lose to it. Render machine text as `pre > code`, which the rule exempts, or use a `span`. Verify computed styles, not class strings.

**Shiki line spans are inline boxes.** Set them `inline-block w-full`. With `block`, every newline renders as its own empty row under `white-space: pre`. An `::before` overlay does not work on them; use an inset box shadow for a gutter bar.

**The kit CodeBlock ships `my-6`.** In a two-column spread, pass `my-0` and let the sibling be `flex flex-col` with its panel `flex-1`, or the code column inflates the grid row and the columns stop co-terminating.

**`items-baseline` uses each child's first line.** A figure whose large number must share a baseline with a heading has to render that number as its first element.

**A CSS mask clips paint, not layout.** A glint or sweep inside a masked box still overflows and can activate the horizontal scrollbar. The masked element needs `overflow-hidden`.

**Verify mobile with device emulation.** Resizing a desktop Chrome window to 390 does not reproduce a phone; the window clamps near 500.

**Hard reload before believing a hydration error.** After editing a kit file or registry data under a hot dev server, stale RSC blames innocent components.

Render the result and inspect the first viewport, the full page, both themes, and the narrow reflow before calling a surface done. A passing build does not show that the design is right.
