# Changes from the docs site

This app is a working copy of parts of `apps/docs`, for redesigning the site without touching it. Files here sit at the same paths as in `apps/docs`, and a file here wins over the docs file at the same path (`tsconfig.json` resolves `@/*` here first, then in `../docs`). To fold a change back, copy the file to the same path in `apps/docs`, then apply the "When folding back" notes below.

Run it with `pnpm -C apps/sitemap dev` (port 3013) while the docs dev server runs on port 3000: API calls, the docs site's public images, and any page not copied here go to it.

## To do

- Build the scripted previews for the six demos on `/demos` (each a small chat on `useLocalRuntime` with a scripted `ChatModelAdapter`, like the docs Blocks' `scriptedModel`); until then each Preview tab says it is not built.
- A second batch of demos: generative UI, suggestions, editing and branching, mentions and slash commands, reading aloud, the thread list.
- A Design action in the react-grab toolbar: copy a design prompt, or leave notes on elements (not decided).
- The header's Ask AI button: the site assistant panel is not wired up in this app.
- Find a place for the stats row (GitHub stars, weekly downloads, Backed by Y Combinator): `HomeStats`, parked at the bottom of the home page under Start building.
- Fold the settled changes back into `apps/docs`.

## Setup (2026-11-25)

Copied unchanged from `apps/docs`:

- `app/(home)/page.tsx` and `app/(home)/layout.tsx`: the home page.
- `components/pages/home/**`: the home page's sections (tests left out).
- `components/shared/footer.tsx`.
- `components/shared/header.tsx`, with one difference: it imports the search dialog as `@/components/shared/lazy-search-dialog` instead of `./lazy-search-dialog`.
- The library at `/library` (`app/library/**`, `components/library/**`, `lib/library/**`), as in the docs `/library` pull request (#10865), with two differences: `lib/library/items.ts` reads docs content from `../docs/content`, and `components/library/item-mark.tsx` loads the ADK icon from www.assistant-ui.com.

When folding back: the header import goes back to `./lazy-search-dialog`, and keep the docs versions of `items.ts` and `item-mark.tsx` from #10865.

Not copied: the site assistant panel (the header's Ask AI button opens nothing), and the home demo's thread list shows "Threads could not be loaded", as it does in the docs dev server without an Assistant Cloud address.

## Library menu in the header (2026-11-25)

The header's Components link is now a Library menu that opens like Products: a featured Library card, then Build (Components, Blocks, Themes, Starters), Connect (Runtimes, Integrations, Tools), and Extend (Utilities, Skills). Each link goes to its `/library/<category>` page and shows the library's own glyph for it. The mobile menu lists the same links.

Files:

- `lib/site-nav.ts` (new): the header's links, taken from the docs `NAV_ITEMS` with the Library menu where Components was. The menu is built from the library's category list, so it follows the library.
- `components/shared/nav-items.tsx` (copied from docs, then changed): draws a menu link's glyph from the header's set or the library's.
- `components/shared/header.tsx`: uses `SITE_NAV_ITEMS` and `siteMegaGroups` instead of `NAV_ITEMS` and `megaGroups`.

When folding back: the Library entry belongs in `NAV_ITEMS` in `apps/docs/lib/constants.ts` in place of the Components link, and `DropdownItem` there needs the `libraryGlyph` field.

## Platforms in the library (2026-11-25)

The library has a new first category, Platforms, at `/library/platforms`: React, React Native, Ink, and Vue, each with its package's install command (`@assistant-ui/react`, `@assistant-ui/react-native`, `@assistant-ui/react-ink`, `@assistant-ui/vue`) and an agent prompt. Names, pages, and descriptions come from the header's `PLATFORM_LINKS`, so they match the Products menu, and each item shows the header's own glyph for that platform. The header's Library menu lists Platforms first under Build.

Files:

- `lib/library/catalog.ts`: the `platforms` category.
- `lib/library/items.ts`: the platform items, built from `PLATFORM_LINKS`.
- `components/library/library-glyph.tsx` and `components/library/item-glyph.tsx`: the category's and items' glyphs.
- `components/shared/nav-glyph.tsx` (copied from docs, then changed): adds `NavGlyphArt`, which draws a header glyph without its frame.
- `lib/site-nav.ts`: Platforms in the menu's Build group.

When folding back: add the `NavGlyphArt` export to `apps/docs/components/shared/nav-glyph.tsx`, and bring over the five library files above.

## Library grouped by what a visitor is doing (2026-11-25)

The library's pages are now in four groups, used by both the header's Library menu and the library sidebar:

- Start: Setup, Platforms, Starters.
- Browse: Components, Blocks, Themes (the categories shown as previews).
- Connect: Runtimes, Integrations, Tools.
- Extend: Utilities, Skills.

Setup is in the header menu for the first time, with the library's setup glyph, and in the sidebar it moved from the top (beside Cart) into Start. The sidebar's group headings replace its single "Library" heading. The menu's featured card is now labeled "Everything", and the menu lays out four groups beside it in one row. The categories are listed in the same order, so the library home follows it too.

Files:

- `lib/library/catalog.ts`: `LIBRARY_GROUPS` and `LibraryPageId`, and Starters moved after Platforms.
- `components/library/item-glyph.tsx`: `LibraryPageGlyph`, a glyph for Setup or any category.
- `components/library/library-sidebar.tsx`: the grouped list.
- `lib/site-nav.ts`: the menu built from `LIBRARY_GROUPS`, with a Setup link.
- `components/shared/nav-items.tsx`: draws `LibraryPageGlyph`, and a five-column layout for a featured card beside four groups.

When folding back: bring over these files; the `nav-items.tsx` layout change applies to the docs menu component.

## A lighter Library menu (2026-11-25)

Chosen from three variants (links with a bottom link, Overview under Start, compact text). The big featured "Everything" card is gone: the Library menu is four columns (Start, Browse, Connect, Extend) with a "See the whole library →" link to `/library` under them, and the phone menu ends its Library list with the same link. This replaces the featured card and the five-column layout from the entry above.

Files:

- `lib/site-nav.ts`: no featured card; a `footer` link on the menu.
- `components/shared/nav-items.tsx`: draws a menu's `footer` link under its columns; the five-column layout is removed.
- `components/shared/header.tsx`: the phone menu shows the `footer` link.

When folding back: `NavItem` in `apps/docs/lib/constants.ts` needs the optional `footer` field, and the docs header and menu component need these two small additions.

## Home hero fills the first screen (2026-11-25)

Everything above the home demo (headline, subhead, setup command, Talk to an expert, stats) now fills the first screen under the header and sits centered in its height, so the demo only appears once you scroll. The page's top padding is dropped on the home page to make room.

Files:

- `app/(home)/page.tsx`: the hero is wrapped in a block `100svh` tall minus the 3rem header, centered vertically, and `PageFrame` gets `pt-0`.

When folding back: the same two edits in `apps/docs/app/(home)/page.tsx`.

## react-grab toolbar (2026-11-25)

The react-grab toolbar the docs site shows in development now loads here too, the same way: `instrumentation-client.ts` imports it only when `NODE_ENV` is development, and `react-grab` is a dev dependency. Because react-grab breaks dragging the library sidebar's resize handle, the library shell has a development-only fix that restores the events' `currentTarget` before the resize library reads them.

Files:

- `instrumentation-client.ts` (new): loads react-grab in development.
- `package.json`: `react-grab` dev dependency.
- `components/library/library-shell.tsx`: the drag fix.

When folding back: the docs site already loads react-grab; the drag fix belongs in the docs library shell from #10865, where the handle has the same problem in development.

## Token panel (2026-11-25)

A round button in the bottom-right corner, in development only, opens a sheet from the right edge for playing with the design tokens the /design page documents. The sheet leaves the page visible and usable beside it, and clicking the page does not close it. Edits apply live, stay after a reload (this browser only), and each changed row has its own reset; Copy CSS copies only the changed tokens as CSS, and Reset all returns to the docs values.

- Shape: every radius, from `--radius-page` to `--radius-capsule`.
- Ink: `--tint`, then background, foreground, muted, muted foreground, and destructive (lightness, chroma, and hue where it has its own) for the mode you are viewing, plus blue-500 and the glint.
- Line: the border's lightness, chroma, and opacity.
- Voice: the display, sans, and mono fonts (from a short list; Public Sans and JetBrains Mono are the site's own, the rest load from Google Fonts) and the hero and section tracking.
- Type: size (and size at the larger breakpoint), leading, weight, and tracking for typeHero, typePage, typeSection, typeDeck, and typePackage.
- Motion: the hero-word, hero-rise, and hero-glint durations, and Replay to run the animations again.

To make radii, fonts, and tracking changeable at runtime, this app declares them again without `@theme inline`, and its copy of the type styles reads `--type-*` variables whose fallbacks are the docs values. With nothing changed, the site renders exactly as before.

Files:

- `components/dev/token-panel.tsx` (new): the panel.
- `lib/tokens.ts` (new): the tokens, their docs defaults, and the CSS written for changes.
- `app/layout.tsx`: mounts the panel in development.
- `app/globals.css`: the tokens declared without `inline`.
- `components/shared/type.ts` (copied from docs, then changed): the type styles read `--type-*` variables.

When folding back: a value you settle on goes into `apps/docs/styles/globals.css` (or `type.ts` for type) using Copy CSS; the panel itself is a tool for this app and does not need to move.

## Changes page (2026-11-25)

`/changes` shows this file as a page: the To do list first, then every change newest first with its date, summary, files (collapsed), and what to do when folding it back. `CHANGES.md` stays the one place to write things down; the page reads it, so a new section here shows up there. Sections are `## Title (YYYY-MM-DD)` with an optional `Files:` list and `When folding back:` paragraph, and `## To do` holds the plan.

Files:

- `app/(home)/changes/page.tsx` (new): the page, with the site's header and footer.
- `lib/changes.ts` (new): reads `CHANGES.md` into the to-do list and the changes.

When folding back: nothing; the page is for this app.

## Token presets and code themes (2026-11-25)

The token sheet starts with Presets: assistant-ui (the docs design system as it is) and AI Ellie (rounder, with control 12px, surface 14px, dialog 18px, and thread 22px; Geist and Geist Mono; a step lighter in every type weight with tighter tracking; neutrals on zinc's cool hue, tint 286; and the Nord code theme). A preset replaces every token, and you can keep adjusting from there.

A new Code section picks the code theme: GitHub (the site's own), Ink (monochrome, made from the foreground), Nord (cool), and Warm. It recolors both highlighters the site uses: Code Hike blocks through their `--ch-*` variables, and Shiki snippets by matching the GitHub colors their tokens carry.

Also fixed:

- The site's fonts fell back to the system font with the token panel's theme change, because `--font-display` and friends resolve on `:root` while next/font set its variables on `<body>`. The font variables now sit on `<html>`.
- The kit's buttons use `rounded-lg` and its small buttons `rounded-md`, not `--radius-control`; both now follow `--radius-control` (all 8px by default), so changing the control radius rounds the buttons.

Files:

- `lib/tokens.ts`: `PRESETS`, `CODE_THEMES`, and the code theme CSS.
- `components/dev/token-panel.tsx`: the Presets row and the Code section.
- `app/globals.css`: `--radius-lg` and `--radius-md` follow `--radius-control`.
- `app/layout.tsx`: the font variables on `<html>`.

When folding back: a preset you settle on goes into the docs stylesheet through Copy CSS; the font-variable and radius changes belong with the token groundwork, which the docs site only needs if it adopts runtime tokens.

## Hero buttons: Start and Talk to the team (2026-11-25)

The setup command box under the hero (and in the "Start building" section at the bottom of the page) is replaced by a Start button that goes to the library's Setup page, tracked as `get_started`. The second button now reads "Talk to the team", chosen from four wordings (Talk to an expert, Talk to the team, Contact sales, Talk to us) because it matches the contact page's heading.

Files:

- `components/pages/home/hero.tsx`: `HeroCta` has the Start button and the new label.

When folding back: the same `HeroCta` change in `apps/docs/components/pages/home/hero.tsx`; the docs site's Start target would be its own setup page.

## Logos under the hero (2026-11-25)

The row of company logos (Google Cloud, AWS, Neon, builder.io, and the rest) moved from further down the home page to the bottom of the first screen, in one line: nine on wider screens, five on a phone, still rotating. The hero sits centered between the header and that row, and the demo still starts below the fold.

Files:

- `components/pages/home/trusted-by.tsx`: a `layout="row"` option that puts every slot in one line.
- `app/(home)/page.tsx`: the first screen is the hero and the logo row.
- `components/pages/home/library-body.tsx`: the logos no longer appear in their old spot.

When folding back: the same three edits in apps/docs.

## Logos as a marquee (2026-11-25)

Chosen from three versions (an aligned rotating row, a marquee, and all logos at once). The logo row under the hero is now a marquee of all 23 logos, scrolling slowly in one line inside the page column, so its edges line up with the hero text; it fades out at both ends, pauses on hover, and stands still for reduced motion. The first copy of each logo is a link; the repeat that makes the loop seamless is hidden from screen readers and the keyboard.

Files:

- `components/pages/home/trusted-by.tsx`: back to the docs version, plus `LogoMarquee`.
- `app/(home)/page.tsx`: the first screen uses `LogoMarquee`.
- `app/globals.css`: the `logo-marquee` keyframes.

When folding back: `LogoMarquee` and its keyframes go into the docs files of the same names, and the docs home page uses it under the hero.

## Stats row out of the hero (2026-11-25)

The row with GitHub stars, weekly downloads, and Backed by Y Combinator is out of the hero, so the first screen is the headline, the line under it, the two buttons, and the logos. The row is now its own `HomeStats` piece, parked at the bottom of the home page under Start building until it has a place (it is on the To do list).

Files:

- `components/pages/home/hero.tsx`: `HomeStats` (the row, without its entrance animation); `Hero` no longer takes the stars and downloads.
- `app/(home)/page.tsx`: `HomeStats` under the page's last section.

When folding back: wherever the row ends up, `HomeStats` moves with it.

## Hero: headline, buttons, and an architecture stack (2026-11-25)

The hero now reads, top to bottom: "The frontend library for AI agents." on one line (chosen over "Frontend for AI agents.", "The AI agent frontend.", and the old "The frontend library for AI agents."), the buttons Explore the library (to `/library`, replacing Start) and Talk to the team, and an interactive stack of assistant-ui's architecture in place of the old description line ("Primitives and a runtime for production chat. Any backend, through adapters." is gone).

The stack follows the five layers of the docs' Architecture page (UI, Runtime, Integrations, Backend, Persistence) and is styled like the Timeline element: a numbered rail of dots joined by a hairline, each layer's name and one-line description beside its dot. A click opens a layer's examples (the pieces the docs name, such as AI SDK, LangGraph, `DataStream`, and `AssistantTransport` under Integrations) and a link to its library or docs page; the open layer's dot is blue with a soft ring, and a second click closes it, so every layer can be closed. It starts closed. Room for one open layer is kept below the stack, so opening or closing never moves the vertically centered hero; that is why the buttons sit above the stack. It uses the Base UI accordion parts, Tab and Enter or Space to work it from the keyboard, and its open and close motion stops under reduced motion.

The logos are back in their original place further down the page, in their two rotating rows (the marquee under the hero was removed), and the hero is centered in the full first screen again.

Files:

- `components/pages/home/architecture.tsx` (new): the stack.
- `components/pages/home/hero.tsx`: the fixed headline, the stack, Explore the library.
- `app/(home)/page.tsx`: the first screen is the hero alone, centered.
- `components/pages/home/trusted-by.tsx` and `components/pages/home/library-body.tsx`: back to the docs versions.
- `app/globals.css`: the marquee keyframes removed.

When folding back: `architecture.tsx` and the hero changes go to the same paths in apps/docs; the logo files need nothing.

## Architecture stack in its own section (2026-11-25)

The hero is back to its earlier shape, centered in the first screen: "The frontend library for AI agents.", the description "Primitives and a runtime for production chat. Any backend, through adapters.", and the buttons Explore the library and Talk to the team. The architecture stack moved out of the hero into its own section right after the demo, headed "How it fits together." with one line under it; it works the same (five layers, a click opens one, another click closes it). Without the stack, the hero no longer reserves room for an open layer.

Files:

- `components/pages/home/hero.tsx`: the description is back and the stack is gone.
- `app/(home)/page.tsx`: the "How it fits together." section with `Architecture`, between the demo and the rest of the page.

When folding back: the same section in `apps/docs/app/(home)/page.tsx`, with `architecture.tsx` copied to the same path.

## Headline on two lines (2026-11-25)

The headline breaks after "for": "The frontend library for" on the first line and "AI agents." on the second, on every screen size. The break is placed on purpose rather than by a width limit, the words still arrive one after another, and screen readers get the whole sentence with its spaces.

Files:

- `components/pages/home/hero.tsx`: `HeroHeadline` takes its lines as a list.

When folding back: the same `HeroHeadline` change in `apps/docs/components/pages/home/hero.tsx`.

## AGENTS.md for this app (2026-11-25)

`AGENTS.md` here gives an agent working in this app its commands (both dev servers, typecheck, lint) and rules: edit only this app, override docs files by copying them to the same path, record every change in this file, follow the docs design rules, show design options as live variants, verify in the browser, keep development tools out of production, and commit and push to `feat/sitemap-app`.

Files:

- `AGENTS.md` (new).

When folding back: nothing; it is for this app.

## AI Ellie: tighter tracking (2026-11-25)

The AI Ellie preset sets its letters a little closer: the hero headline at -0.035em (was -0.025em), section and page titles at -0.022em (was -0.015em), and the line under the headline at -0.005em (was the docs' 0).

Files:

- `lib/tokens.ts`: the AI Ellie preset's tracking.

When folding back: nothing unless AI Ellie becomes the site's look, in which case Copy CSS carries these values.

## AI Ellie: rounder documents, round controls, blue glint (2026-11-25)

The AI Ellie preset's document radius is 12px (was 10px) and its control radius is fully round, so buttons, inputs, and small buttons become pills (the kit's `rounded-lg` and `rounded-md` follow `--radius-control`, so rows that use them round too). Its glint is a two-color band, blue-500 into Tailwind's sky-400. The assistant-ui preset keeps the gold glint; the glint variants on the home page (gold, blue, gold to blue, soft blue, ink and blue) are removed, since the choice now lives in the preset.

In the token sheet, any radius at its slider's end now means fully round (it used to be the capsule radius only), and the Ink section can add a second glint color for a two-color band, or remove it.

Files:

- `lib/tokens.ts`: `glint2`, a full value for every radius, and the AI Ellie values.
- `components/dev/token-panel.tsx`: the second glint color and "full" for any radius.
- `components/pages/home/hero.tsx`: the glint variants removed.

When folding back: nothing unless AI Ellie becomes the site's look; Copy CSS carries these values, including the glint band.

## AI Ellie: only buttons and badges fully round (2026-11-25)

Fully round corners now apply to buttons and badges only. The AI Ellie preset's control radius is back to 12px, so inputs, selects, and menu rows keep soft corners, and a new Shape setting, "buttons & badges", rounds just those two; AI Ellie sets it to full. Left unchanged, buttons and badges follow `--radius-control` as before.

Files:

- `lib/tokens.ts`: `buttonRadius`, written as a rule on `[data-slot="button"]` and `[data-slot="badge"]`, and the AI Ellie values.
- `components/dev/token-panel.tsx`: the "buttons & badges" slider.

When folding back: nothing unless AI Ellie becomes the site's look; Copy CSS carries the rule.

## Demos panel in the hero (2026-11-25)

On wide screens (1280px and up) the hero's right side is a Demos panel instead of the dotted logo mark. Tabs along the top (Base, ChatGPT, Claude, Grok, Gemini, Perplexity) each open a live demo, scaled down to a miniature that can still be clicked and typed in. Under it, the demo's one-line description and an "Open the demo" link to its `/demos/<slug>` page. Only the open tab's demo is mounted. The arrow keys move between tabs and Enter or Space opens one, so tabbing past does not load each demo. Below 1280px the dotted mark is back as before; phones show neither.

Files:

- `components/pages/home/demo-panel.tsx` (new): the panel, built from the kit's line tabs, the docs `DEMOS` list, and `DocsRuntimeProvider`.
- `components/pages/home/hero.tsx`: a two-column grid at `xl`, the panel in the second column, and the mark hidden at `xl`.

When folding back: the hero changes here were undone; see "Demos panel under the home demo".

## Demos panel on a plate (2026-11-25)

Chosen from variants: content (all six demos; Base, ChatGPT, Claude; those three plus Artifacts; Base only) and style (line tabs above, tabs in a title bar, tabs under the demo, segmented on a plate, side list). The panel keeps all six demos and is now drawn on a plate: a lightly tinted panel (`bg-foreground/[0.025]`, dark `/[0.04]`) with no border, segmented tabs centered at the top, the demo in a borderless frame inside it, and the description with "Open the demo" underneath. The variants and the `@assistant-ui/variants` dev dependency are removed.

Files:

- `components/pages/home/demo-panel.tsx`: the plate, the segmented tabs, and the borderless frame.

When folding back: copy `demo-panel.tsx` to the same path in `apps/docs`.

## Demos panel under the home demo (2026-11-25)

The Demos panel moved out of the hero to right under the home demo, which stays where it was. The hero is back as it was before the panel: text on the left and the dotted logo mark with its glint on the right (tablet width and up). The panel now shows at every width; on a phone the tab row scrolls sideways inside the panel instead of widening the page.

Files:

- `components/pages/home/hero.tsx`: back to its state before "Demos panel in the hero".
- `app/(home)/page.tsx`: `<DemoPanel />` after `<HomeDemo />`.
- `components/pages/home/demo-panel.tsx`: the tab row scrolls when it does not fit.

When folding back: copy `demo-panel.tsx` to the same path in `apps/docs` and add `<DemoPanel />` after `<HomeDemo />` in the docs `app/(home)/page.tsx`; the docs hero needs nothing from these changes.

## Tabs on the home demo; Demos panel removed (2026-11-25)

The home demo has a row of tabs over it and a description under it. The first tab, assistant-ui, is the home demo as before (full screen still works); ChatGPT, Claude, Grok, Gemini, and Perplexity follow at full size in the same frame. Base is left out, since the first tab already shows the full unthemed app. The home demo stays mounted when another tab is open, so its conversation survives a switch. Under the frame: the open tab's description on the left and a link on the right ("Explore other examples" for the home demo, "Open the demo" for the others). On a phone the tab row scrolls sideways inside its width.

Two styles are still open as variants (the line tabs and title bar variants were dropped): on a plate (a tinted panel with pill tabs, as the removed panel had) and lifted (white tab bar and frame, each with a soft shadow; the active tab takes the muted fill). The shadows are inline styles, because the docs theme zeroes the `--shadow-*` tokens; design.md allows shadows only on floating surfaces, so the lifted style is an exception if chosen.

The separate Demos panel under the home demo is removed, since the home demo now has the same tabs.

Files:

- `components/pages/home/demo/index.tsx` (copied from docs, then changed): the tabs, the description row, and the two style variants.
- `app/(home)/page.tsx`: `<DemoPanel />` removed.
- `components/pages/home/demo-panel.tsx`: deleted.
- `package.json` and the root `pnpm-lock.yaml`: `@assistant-ui/variants` as a dev dependency while the variants are open.

When folding back: after a style is picked and the variants removed, copy `components/pages/home/demo/index.tsx` to the same path in `apps/docs`. Skip "Demos panel in the hero", "Demos panel on a plate", and "Demos panel under the home demo": that panel no longer exists.

## Home demo: lifted frame, flat tabs (2026-11-25)

Chosen from the two variants: the lifted style, with the tab bar not lifted. The demo frame keeps its soft shadow; the tab bar is white (the page background) with a hairline and no shadow, and the open tab takes the muted fill. The plate style, the variants, and the `@assistant-ui/variants` dev dependency are removed, so `package.json` and the root `pnpm-lock.yaml` are back as they were.

Files:

- `components/pages/home/demo/index.tsx`: one layout, no variants.
- `package.json`, root `pnpm-lock.yaml`: the dev dependency removed.

When folding back: copy `components/pages/home/demo/index.tsx` to the same path in `apps/docs`. The frame's shadow is an exception to design.md, which keeps shadows for floating surfaces.

## Demos page (2026-11-25)

A new page at `/demos` lists the first six feature demos: Chat, Tool UI, Approval, Reasoning, Attachments, and State and actions. Each has a number, a title, a one-line description, the hooks and APIs it uses, and tabs for its preview and its files. The files are the code you write with AI SDK on the server, taken from the current docs (`useChatRuntime` from `@assistant-ui/ai-sdk`, toolkits through `AuiConfig` and `Tools`, `toolApproval` with `respondToApproval`, `sendReasoning`, `SimpleImageAttachmentAdapter`, `useAui` and `useAuiState`). Every demo has `app/page.tsx`; the route appears when the server changes, a toolkit file when there is a tool, so a demo has two or three files. The code is highlighted on the server the way the home page highlights its setup snippets. The previews are not built yet.

Files:

- `app/(home)/demos/page.tsx` (new): the page.
- `components/pages/demos/demo-tabs.tsx` (new): the preview and file tabs.
- `lib/scripted-demos.ts` (new): the demos and their files.

When folding back: copy the three files to the same paths in `apps/docs`. The docs have `/demos/<name>` pages (the ChatGPT-style demos) but no page at `/demos`, so nothing is replaced; a link to it in the header is not decided.
