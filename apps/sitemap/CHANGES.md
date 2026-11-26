# Changes from the docs site

This app is a working copy of parts of `apps/docs`, for redesigning the site without touching it. Files here sit at the same paths as in `apps/docs`, and a file here wins over the docs file at the same path (`tsconfig.json` resolves `@/*` here first, then in `../docs`). To fold a change back, copy the file to the same path in `apps/docs`, then apply the "When folding back" notes below.

Run it with `pnpm -C apps/sitemap dev` (port 3013) while the docs dev server runs on port 3000: API calls, the docs site's public images, and any page not copied here go to it.

## To do

- Icons for Codemaker and Neovate in `components/library/agent-icons.tsx`; the Skills page shows their first letter until there is a source for them.
- Link `/skills` from the site: the header's Library menu (Extend, beside Skills) or the Resources menu.
- Link `/utilities` from the site the same way (the Library menu's Extend group has Utilities).
- Build `/starters` as its own page, grouped by platform, and point each Platforms tile's "Start from" links at it instead of GitHub.
- Link `/platforms` from the site (the Products menu's Platforms group and the Library menu's Start group).
- Point the header's Products menu (Platforms group) and the footer's Platforms column at `/react`, `/react-native`, `/ink`, and `/vue`; they still go to `/docs`, `/native`, `/ink`, and `/docs/vue`.
- Build the other nine runtime demos on `/demos` from the Thread file once its design is settled: each one complete file in `components/demos/` (`useChatRuntime` plus the whole chat UI, starting from a copy of Thread's, and anything only that demo needs), with a `.preview.tsx` that runs its Thread on a script. Reasoning, Tools, Approval, Sources, Attachments, Branching, Suggestions, Voice, Generative UI.
- Restyle the ChatGPT, Claude, Grok, and Perplexity clones the way Gemini was: a folder each with the file, `data.json`, and `themes.css`, signed in as the demo person.
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

## Scripted Chat preview (2026-11-25)

The Chat demo on `/demos` has a working preview: the kit's `<Thread />`, the same component the code imports, on `useLocalRuntime` with a scripted `ChatModelAdapter` in place of `useChatRuntime`. A reply streams in word by word, says that it comes from a script, and walks through the three steps a model run takes (the page sends to `/api/chat`, the route calls `streamText`, the reply streams back). Copy and reload work as in any Thread. The preview and code tabs are 30rem tall.

All the demos' routes stay at `app/api/chat/route.ts`: `useChatRuntime` posts every message to `/api/chat`, and a tool runs inside that request when the model calls it, so a tool needs no route of its own.

Files:

- `components/pages/demos/previews/chat.tsx` (new): the scripted Chat preview.
- `components/pages/demos/demo-tabs.tsx`: takes a `preview`, and the taller panels.
- `app/(home)/demos/page.tsx`: passes each demo its preview.

When folding back: copy these files to the same paths in `apps/docs`.

## Demos show their UI: a Thread built from primitives (2026-11-25)

The Chat demo now shows its UI code as well: a `components/thread.tsx` tab with a small Thread built from assistant-ui's primitives (`ThreadPrimitive`, `MessagePrimitive`, `ComposerPrimitive`, `ActionBarPrimitive`, `AuiIf`) and `MarkdownTextPrimitive` from `@assistant-ui/react-markdown`, with all its styling in that one file. The preview runs this same file instead of the kit's Thread, and the tab reads the file from disk, so what the tab shows is what the preview runs; edits show in the tab within a minute while the dev server runs. Every demo's `app/page.tsx` now imports `Thread` from `@/components/thread`. The Thread: messages centered at up to 42rem, user messages in a muted bubble, assistant replies in markdown with Copy and Retry, a bordered composer with a round Send button that turns into Stop while a reply runs, and "Ask anything." when the thread is empty. The preview stays mounted while a code tab is open, so a test chat survives a look at the code.

Files:

- `components/pages/demos/ui/thread.tsx` (new): the Thread the previews run and the tabs show.
- `components/pages/demos/previews/chat.tsx`: uses that Thread.
- `lib/scripted-demos.ts`: a file can be read from `source`; Chat lists `components/thread.tsx`; pages import `@/components/thread`.
- `app/(home)/demos/page.tsx`: reads `source` files (cached for minutes).
- `components/pages/demos/demo-tabs.tsx`: the preview stays mounted.

When folding back: copy these files to the same paths in `apps/docs`, and list `components/pages/demos/ui/` in the route's `outputFileTracingIncludes` so the deployed page can read it.

## Scripted Tool UI preview (2026-11-25)

The Tool UI demo on `/demos` works. Ask about the weather in a city: the script calls `getWeather` the way the model would, the card shows "Checking the weather in …" while the call runs, then the city, the temperature, and the condition with an icon, and a short reply streams in under it saying the numbers come from the script. The city is the words after "in", "for", or "at" (Tokyo when there are none), and the same city always gets the same made-up weather. The card is a real file, `components/pages/demos/ui/weather-toolkit.tsx`, registered with `AuiConfig` and `Tools` exactly as `app/page.tsx` shows, and the `app/toolkit.tsx` tab reads that file. The Thread is the same as Chat's. The scripted previews now share their helpers (waiting, the last user message, streaming a reply a word at a time).

Files:

- `components/pages/demos/ui/weather-toolkit.tsx` (new): the weather card and its toolkit entry.
- `components/pages/demos/previews/tool-ui.tsx` (new): the scripted weather run.
- `components/pages/demos/previews/script.ts` (new): the helpers the previews share.
- `components/pages/demos/previews/chat.tsx`: uses the shared helpers.
- `lib/scripted-demos.ts`: Tool UI reads its toolkit from the file and says what to ask.
- `app/(home)/demos/page.tsx`: passes Tool UI its preview.

When folding back: copy these files to the same paths in `apps/docs`.

## Planned Elements demos (2026-11-25)

`/demos` now lists the whole plan: the six feature demos, then thirteen planned demos, one for each group of the docs' Elements catalog (Messages, Tool use, Knowledge, Structured output, Agents, Observability, Composer, Voice, Thread, AUI connected, Renderers, Primitives, Generative). Each planned demo is one scripted chat that will use every element in its group: it shows the group's description from the catalog, "Not built yet" with its element count, and the elements as links to their `/elements/<slug>` pages (which open on the docs site). The Reasoning demo lists its six elements under its tabs. The element names and slugs come from `ELEMENT_SECTIONS` in the docs' `components/pages/elements/registry.tsx` and, for Generative, the gallery templates: 151 elements in all.

Files:

- `lib/scripted-demos.ts`: `DemoElement`, `elements` on a demo, a demo with no files counts as planned, the thirteen planned demos, and Reasoning's elements.
- `app/(home)/demos/page.tsx`: the element links, planned demos without tabs, and the deck mentions Elements groups.

When folding back: copy both files to the same paths in `apps/docs`, once the planned demos are built.

## Demos, second version: the ten runtime demos as scripted Threads (2026-11-25)

`/demos` now follows the home page's "What the runtime handles": Streaming, Reasoning, Tools, Approval, Sources, Attachments, Branching, Suggestions, Voice, and Generative UI, in that order. Every demo is the same Thread on a script, so they read as one set; each opens with suggestions, the first "How does … work?", and offers follow-up suggestions after every reply, so there is always something to click. Streaming is built: "How does streaming text work?" streams an answer about `streamText` and `useChatRuntime`, and "Can I stop a reply halfway?" streams slowly enough to press Stop, which ends the reply where it is. The other nine say "Not built yet". Its tabs show `app/page.tsx` (the same suggestions with `useChatRuntime`: `Suggestions` for the welcome prompts, a `SuggestionAdapter` for the follow-ups), `components/thread.tsx` (read from the file the demo runs), and the route.

The Thread moved to `components/demos/thread.tsx` and gained the welcome suggestions (`ThreadPrimitive.Suggestions` with `SuggestionPrimitive.Trigger`) and a row of follow-up chips above the composer (`thread.suggestions` with `ThreadPrimitive.Suggestion`). The six feature demos and the thirteen Elements groups are off the page; the first version's Chat and Tool UI previews, its Thread, and the weather card are removed from `components/pages/demos/`. A copy of the first version runs locally at `/demos-v1` (`components/demos-v1/` and `app/(home)/demos-v1/`, kept out of git by `.git/info/exclude`).

Files:

- `components/demos/thread.tsx` (new, moved from `components/pages/demos/ui/thread.tsx`): the shared Thread, now with suggestions.
- `components/demos/script.ts` (new, moved from `components/pages/demos/previews/script.ts`): the shared script helpers, with a per-reply speed.
- `components/demos/streaming-text.tsx` (new): the Streaming demo.
- `components/pages/demos/previews/*`, `components/pages/demos/ui/*`: deleted.
- `lib/scripted-demos.ts`: the ten runtime demos.
- `app/(home)/demos/page.tsx`: the ten demos, the new deck, no Elements groups.

When folding back: copy `components/demos/`, `components/pages/demos/demo-tabs.tsx`, `lib/scripted-demos.ts`, and `app/(home)/demos/page.tsx` to the same paths in `apps/docs`, once the nine are built.

## Demos show one file (2026-11-25)

Each demo now shows only its own file, the one that runs: Streaming's tabs are Preview and `components/demos/streaming-text.tsx`, read from disk. The `app/page.tsx`, `components/thread.tsx`, and route tabs are gone, and with them the written-out code strings in `lib/scripted-demos.ts`; a demo's file is always read from `source`. The hooks listed for Streaming match its file (`useLocalRuntime`, `ChatModelAdapter`, `Suggestions`, `SuggestionAdapter`), and a "Set it up with a model" link under them opens the AI SDK runtime docs, where the same Thread runs on `useChatRuntime` and a route.

Files:

- `lib/scripted-demos.ts`: one source file per demo; the code strings removed.
- `app/(home)/demos/page.tsx`: reads each demo's file, the setup link, the deck says "the file that runs it".

When folding back: as in "Demos, second version".

## Demos as one complete file, the ai-sdk.dev way (2026-11-25)

Modeled on the ai-sdk.dev homepage, where each demo tab is one short, complete file (`chat.tsx`, `chat-tools.tsx`, `generative-ui.tsx`) shown in a window with its file name as the title and a Code / Preview switch. `components/demos/streaming-text.tsx` is now that file for Streaming: `useChatRuntime` with the suggestion adapter and welcome `Suggestions`, and the whole chat UI built inline from primitives (welcome suggestions, follow-up chips, messages with markdown, Copy and Retry, the composer with Send and Stop). It is the template for the other nine and the place to design the chat. The script moved to `components/demos/streaming-text.preview.tsx`, which renders the file's own `Thread`, `PROMPTS`, and `followUps` on `useLocalRuntime` with scripted replies, so the preview runs the code the Code view shows with only the runtime swapped. The shared `components/demos/thread.tsx` is gone. On `/demos`, a demo is a window: the file name in a title bar, Code and Preview on the right, Preview first and kept mounted while the code is open. The window has no colored dots in its title bar, since design.md allows no decoration.

Files:

- `components/demos/streaming-text.tsx`: the complete Streaming file.
- `components/demos/streaming-text.preview.tsx` (new): the scripted preview of that file.
- `components/demos/thread.tsx`: deleted.
- `components/pages/demos/demo-window.tsx` (new): the window with the Code / Preview switch.
- `components/pages/demos/demo-tabs.tsx`: deleted.
- `lib/scripted-demos.ts`: one named `file` per demo; Streaming's hooks match its file.
- `app/(home)/demos/page.tsx`: the window, the new deck.

When folding back: copy `components/demos/`, `components/pages/demos/demo-window.tsx`, `lib/scripted-demos.ts`, and `app/(home)/demos/page.tsx` to the same paths in `apps/docs`, once the nine are built.

## Streaming demo, designed: Streaming text, Loader, and a set-up card (2026-11-25)

The Streaming demo now uses the two Elements its set-up answer installs, the way their docs' runtime instructions say. Replies draw through the Streaming text element as the `Text` part renderer (the newest words tinted with a caret while a part runs), and the Loader shows while a run is active and the reply has no parts yet. The empty state has the title "Streaming text" and two suggestions, "How does it work?" and "How do I set it up?"; each offers the other as a follow-up. The set-up answer streams one sentence, then a card drawn by a `showSetup` toolkit entry: Terminal (`npx shadcn@latest add @assistant-ui/elements-loading-state @assistant-ui/elements-streaming-text`) and Prompt (the site's agent prompt for both elements, ``install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/loading-state,elements/streaming-text` ``), each with a Copy button on the kit's `useCopyToClipboard`. The runtime is written out as in the docs, `useChatRuntime({ transport: new AssistantChatTransport({ api: "/api/chat" }) })`. Replies are one paragraph, because the Streaming text element draws words, not line breaks or markdown. The preview's script waits long enough for the Loader to show, then calls `showSetup` for the set-up question the way the model would.

Files:

- `components/demos/streaming-text.tsx`: the elements, the title and suggestions, the set-up card, the explicit transport.
- `components/demos/streaming-text.preview.tsx`: the scripted replies and the `showSetup` call.
- `lib/scripted-demos.ts`: Streaming's description and hooks.

When folding back: as in "Demos as one complete file". The route behind `/api/chat` defines `showSetup` for the card in a real app.

## Streaming demo without the Loader (2026-11-25)

The Loader is out of the Streaming demo: a reply appears when its first word lands, drawn by the Streaming text element. The set-up card installs only that element: Terminal is `npx shadcn@latest add @assistant-ui/elements-streaming-text`, and Prompt is ``install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/streaming-text` ``. The scripted reply names one element, and the script's pause before the first word is back to 350ms.

Files:

- `components/demos/streaming-text.tsx`: the Loader, its import, and the waiting check removed; the command and prompt name only Streaming text.
- `components/demos/streaming-text.preview.tsx`: the set-up sentence and the shorter pause.
- `lib/scripted-demos.ts`: Streaming's description and hooks without the Loader.

When folding back: as in "Demos as one complete file".

## Thread demo, first on /demos (2026-11-25)

A Thread demo now comes first on `/demos`, before Streaming, which is unchanged. `components/demos/thread.tsx` is one complete file like Streaming's: `useChatRuntime` with `AssistantChatTransport` to `/api/chat`, the welcome `Suggestions` and follow-up adapter, and the whole chat built from primitives, with replies in markdown (`MarkdownTextPrimitive`) and Copy and Retry on each. Its empty state has the title "Thread" and the suggestions "How does it work?" and "How do I set it up?". The first answer explains the Thread in three short paragraphs; the second streams one sentence and then the set-up card for the Thread element: Terminal `npx shadcn@latest add @assistant-ui/thread`, and Prompt ``install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/thread` `` (the site's product name for the element), each with Copy. `components/demos/thread.preview.tsx` runs the file's Thread on a script. Thread's file is the template for the other nine demos.

Files:

- `components/demos/thread.tsx` (new): the Thread demo.
- `components/demos/thread.preview.tsx` (new): its scripted preview.
- `lib/scripted-demos.ts`: Thread first, before the ten.
- `app/(home)/demos/page.tsx`: Thread's preview; the deck starts with the Thread.

When folding back: as in "Demos as one complete file".

## Parts view on the Thread demo (2026-11-25)

The Thread demo shows the home page's "Yours to reshape" on the live chat. A Parts switch sits in the demo window's title bar, beside Code and Preview, for demos that offer it (Thread, for now). Turned on, it outlines each part of the running chat in blue and names its component in `thread.tsx`: Thread, Welcome, UserMessage, AssistantMessage, ActionBar, FollowUps, Composer, and SetupCard when the set-up card is on screen. The chat keeps working underneath, and the outlines follow it as it streams, scrolls, and resizes. A name is a button: it opens Code at that component's `function` line, highlighted and scrolled into view inside the code panel, without moving the page. To name the parts, each one in `thread.tsx` carries a `data-slot` (the kit's own convention), and the action bar became its own `ActionBar` component so every name points at a real function. Blue follows the anatomy animation on the home page and design.md's rule that blue marks what is selected.

Files:

- `components/demos/thread.tsx`: `data-slot` on each part; `ActionBar` pulled out of `AssistantMessage`.
- `components/pages/demos/parts-overlay.tsx` (new): measures every `data-slot` in the preview and draws the outlines and names.
- `components/pages/demos/demo-window.tsx`: the Parts switch, the overlay, and opening the code at a component.
- `lib/scripted-demos.ts`: `parts` on a demo; on for Thread.
- `app/(home)/demos/page.tsx`: passes `parts` to the window.

When folding back: as in "Demos as one complete file".

## Clones section on /demos (2026-11-25)

`/demos` has a second section, "Clones.", after the Thread and the ten runtime demos: ChatGPT, Claude, Grok, Gemini, and Perplexity, in that order, each in the same window with Code and Preview. The preview is the docs' own clone component, unchanged, with its shared sidebar, on a scripted runtime instead of the docs' model: any message gets a reply that says it is scripted and that the composer, the message actions, and the sidebar come from the clone's file. The Code view reads that file from `apps/docs/components/pages/examples/<name>.tsx`. Each row has the clone's tagline from the docs' demo list and an "Open the full demo" link to `/demos/<name>` (opens on the docs site). The page now draws every row with one `DemoRow`, and the top navigation ends with a link to the section. A row can carry its own link; the runtime demos keep "Set it up with a model".

Files:

- `components/demos/clone.preview.tsx` (new): a clone on a scripted runtime.
- `lib/scripted-demos.ts`: `CLONE_DEMOS` from the docs' `DEMO_META`; `link` on a demo.
- `app/(home)/demos/page.tsx`: `DemoRow`, the Clones section, its nav link, and the description.

When folding back: copy these files to the same paths in `apps/docs`, and point the clone `source` paths at `components/pages/examples/` inside the docs app.

## Clones remade in the demos folder, each with its own sidebar (2026-11-25)

The five clones are no longer imported from the docs. Each is its own file in `components/demos/` (`chatgpt.tsx`, `claude.tsx`, `grok.tsx`, `gemini.tsx`, `perplexity.tsx`), remade from the docs' file: the same UI, plus a default export that sets up the runtime as the docs do (`useChatRuntime` with `AssistantChatTransport` to `/api/chat`), plus the file's own `ThreadShell`, the sidebar written into the file from the docs' shared `clone-thread-shell.tsx`. Each `ThreadShell` keeps the shell's behavior (a collapsible rail with New Thread, search once there are threads, and the thread list; a menu button and a sheet on phones) without its unused options, and Claude's and Perplexity's carry their own rail colors in the class list, so each sidebar can now be restyled for its product. The attachment helper is imported from the kit hook `@/hooks/use-attachment-src` directly. The previews run each file's clone component on a scripted runtime (`ScriptedClone` in `components/demos/clone.preview.tsx`), and the Code view reads our file. Nothing on `/demos` imports from `apps/docs/components/pages/examples` anymore.

Files:

- `components/demos/chatgpt.tsx`, `claude.tsx`, `grok.tsx`, `gemini.tsx`, `perplexity.tsx` (new): the remade clones.
- `components/demos/clone.preview.tsx`: `ScriptedClone`, a scripted runtime around any clone.
- `lib/scripted-demos.ts`: clone sources point at `components/demos/`.
- `app/(home)/demos/page.tsx`: the clone previews from our files; the section's description says each has its own sidebar.

When folding back: copy the files to the same paths in `apps/docs`. The docs' own clones under `components/pages/examples/` stay as they are for the `/demos/<name>` pages, unless these replace them.

## Gemini clone rebuilt as its own folder (2026-11-25)

The Gemini clone is rebuilt from ellie's screenshots as one file, `components/demos/gemini/gemini.tsx`, with its words and menus in `data.json` and its colors in `themes.css`. It uses Material Symbols icons (the `material-symbols` package) and a gradient sparkle made from the docs' Gemini mark. It signs in as a made-up person, Juniper Hale, from `components/demos/person.tsx`, which the other demos can reuse so no real name appears in a demo. There is no Get app or Upgrade button.

What works, on the runtime: the sidebar's chat list from the thread list (open, pin, rename, mark as unread, delete, a filter, an unread dot when a reply lands in another chat, a spinner while one runs, a title from the first message), search chats, New chat, a collapsible rail, and a drawer on narrow widths. Temporary chat keeps a chat out of the list and deletes it when you leave. The composer has a + menu (upload files as attachments, tool chips such as Search Google and Create image that ride along in the run config), @ mentions on the composer's trigger popover, a model menu (Auto; the others locked), dictation, send and stop. Chat and Task modes change the greeting, the glow, and the placeholder; Task shows three task ideas and, the first time, a "Hand off tasks to Gemini" dialog. Replies show "Show thinking" for reasoning, then thumbs up and down, redo, share, copy, and a ⋮ menu where Listen reads the reply aloud. Settings has Theme (System, Light, Dark) working. Menus, tooltips, and dialogs open inside the demo window. Anything Gemini has that this demo does not (Library, Drive, Gmail, and so on) shows a "isn't in this demo" note instead.

The page preview runs it on a script (`gemini.preview.tsx`): a short thinking step, then a reply that says what works.

Files:

- `components/demos/gemini/gemini.tsx`, `data.json`, `themes.css`, `gemini.preview.tsx` (new): the clone, its data and theme, and its scripted preview.
- `components/demos/person.tsx` (new): the demo person and avatar.
- `components/demos/gemini.tsx` (removed): the earlier remake.
- `lib/scripted-demos.ts`: the Gemini clone's file is in its folder.
- `app/(home)/demos/page.tsx`: the Gemini preview from its folder.
- `package.json`, root `pnpm-lock.yaml`: `material-symbols`.

When folding back: copy the folder and `person.tsx` to the same paths in `apps/docs`. The icons are Hugeicons now (see "Gemini icons from Hugeicons"), so no icon package is added.

## Gemini colors from the screenshots, and full screen on demo windows (2026-11-25)

The Gemini clone's colors now come from ellie's screenshots, sampled pixel by pixel, instead of blue tints. Light: a white sidebar, a `#f9f9f9` canvas, warm grey `#f3f0f1` for the selected row, user bubbles, and cards, a white composer with a soft shadow, white menus, and a black tooltip. Dark: a `#1f1f1f` sidebar (`#0f0f0f` when collapsed), a `#0f0f0f` canvas, a darker `#171717` selected row, a `#1e1e20` composer, and `#1f1f1f` menus. The empty-state glow is a ring around the composer: pale blue in light, navy in dark, lavender for Task. The layout follows the screenshots too: the sparkle and "Gemini" head the sidebar with search and a collapse button, the collapsed rail starts with the sparkle, Notebooks is a small section label, the chat list is labeled by its filter ("All"), the footer shows only the name, the greeting is centered without a "Hi" line, Chat and Task are text pills under the composer, the composer is one row (+, text, model, mic), follow-ups say "Ask a follow-up", a long prompt's expand chevron sits inside its bubble, and the reply menu is ⋯.

Every demo window has a full screen button next to Code and Preview. It fills the viewport with the same window and locks the page scroll; the button or Escape returns it (Escape closes an open menu first).

Files:

- `components/demos/gemini/themes.css`, `gemini.tsx`, `data.json`: the sampled palette and the layout changes.
- `components/pages/demos/demo-window.tsx`: the full screen button.

When folding back: copy the files to the same paths in `apps/docs`.

## Gemini icons from Hugeicons (2026-11-25)

Gemini draws its icons from `lumi-symbols`, Google's own icon font, which is not published, so the clone now uses Hugeicons (`@hugeicons/core-free-icons` and `@hugeicons/react`, MIT, already in this app) in place of Material Symbols. `gemini.tsx` maps each icon name it uses to its closest Hugeicons icon in one table, at a 1.6 stroke (2.2 for a pressed rating), so `data.json` keeps its names. The `material-symbols` package is removed again, and the lockfile matches what is committed.

The start screen also shows while a chat is still loading: it now keys off "no messages yet" instead of the thread's empty flag, which reads false during loading and showed a blank conversation for a moment.

Files:

- `components/demos/gemini/gemini.tsx`: the icon table and the empty-state check.
- `components/demos/gemini/themes.css`: Material Symbols rules removed; a pressed rating draws thicker.
- `package.json`: `material-symbols` removed.

When folding back: nothing extra; `apps/docs` already has Hugeicons.

## Skills page (2026-11-25)

A new page at `/skills` for the assistant-ui skills for coding agents. It opens with what a skill is and the one command that installs all of them (`npx skills add assistant-ui/skills`). "What each skill covers." lists the 17 skills by their slash name with a one-line summary; opening a row shows when an agent uses the skill, its own install command, and its `SKILL.md`. "Works in 79 agents." lists every agent the installer supports with the folder it reads skills from; pressing one copies its `-a <agent>` command. The skills come from the docs' `getSkills()` (`lib/agent-skills.generated.json`) and the agents from the library's Skills category, so the page follows both. The page is not linked from the header yet.

Files:

- `app/(home)/skills/page.tsx` (new): the page.
- `components/pages/skills/copy-command.tsx` (new): a command that copies itself, wrapping on a phone, and a list row that copies a command.

When folding back: copy both files to the same paths in `apps/docs`, and add a link to `/skills` wherever the site should point to it (the header, the `/docs/llm` Skills section).

## Agent icons under the skills install command (2026-11-25)

Beside the install command on `/skills`, filling the rest of the line (under it on a phone), a marquee of the agents' icons with no label: the 77 agents the library has an icon for, in one line, scrolling slowly with faded ends. It pauses on hover and stands still for reduced motion; each icon names its agent on hover and to screen readers, and the repeat that makes the loop seamless is hidden from screen readers.

Files:

- `components/pages/skills/agent-marquee.tsx` (new): the marquee.
- `app/(home)/skills/page.tsx`: the install command and the marquee in one row, outside the header so the row spans the page.
- `components/library/agent-icons.tsx`: `hasAgentIcon`, so the marquee leaves out agents without an icon.
- `app/globals.css`: the `skills-agent-marquee` keyframes.

When folding back: copy the marquee and page with the Skills page, add `hasAgentIcon` to the docs `agent-icons.tsx`, and the keyframes to the docs stylesheet.

## Skills as library rows with a SKILL.md dialog (2026-11-25)

Each skill on `/skills` is now a row like the library's list: the skill's library glyph, its `/name`, the one-line summary, and the library's plus menu (Add to cart, Copy install command, Copy assistant-ui prompt). Pressing a row opens a dialog with the full description, the skill's install command, and its `SKILL.md`; on a phone the whole dialog scrolls. The rows replace the expanding rows. The page shares the library's cart: the list sits in a `LibraryProvider` with the cart sheet, so "View cart" in the toast opens it here.

Files:

- `components/pages/skills/skill-list.tsx` (new): the rows, the dialog, and the provider with the cart sheet.
- `app/(home)/skills/page.tsx`: passes the skills, matched to their library items, to `SkillList`.

When folding back: copy both files with the Skills page.

## Skill dialog laid out like a desktop app's skill sheet (2026-11-25)

From a screenshot ellie shared of a skill sheet in a desktop app. The `/skills` dialog now opens with the skill's glyph, a ⋯ menu (Copy assistant-ui prompt, Copy Markdown, Download as `<name>-SKILL.md`) and a close button, then the title as `/<name>` with a muted "Skill" and its one-line summary. Under them, `SKILL.md` is rendered as formatted Markdown (headings, lists, code, links) on a field panel that scrolls, without the file's own `#` title. The footer has Add to cart on the left, which becomes a red Remove from cart once the skill is in the cart, and Copy install command as the main button on the right. The dialog is compact: at most 36rem wide and 34rem tall (the Markdown panel scrolls inside it), with tight padding (12px on a phone, 16px from `sm`, 12px gaps, and 12-14px inside the Markdown panel).

Files:

- `components/pages/skills/skill-list.tsx`: the dialog, rendering Markdown with the kit's `GenerativeMarkdown`.
- `app/(home)/skills/page.tsx`: no longer passes the full description to the dialog.

When folding back: nothing extra beyond the Skills page files.

## Utilities page (2026-11-25)

A new page at `/utilities`, laid out after Vercel's product pages: a large headline and short deck, then one framed grid of seven tiles with hairlines between them and no boxes inside. Each tile has a preview on top and, under it, the package name (pressing it copies the install command), the title linking to that utility's own page, and one line about it.

- heat-graph (two columns): the kit's `HeatGraph` element running on a sample year that ends today.
- tw-shimmer: a skeleton reply and "Thinking" shimmering with the real plugin.
- safe-content-frame: the three frame origins from its page's diagram, one origin per frame.
- react-o11y (two columns): the docs' live trace waterfall, faded at the bottom.
- generative-frame, Variants, DevTools: their README usage, highlighted and faded at the edges.

The titles and lines come from each utility's own page, the install commands and package names from the library's Utilities category. At `md` the grid is two columns and DevTools spans both so the last row is full.

Files:

- `app/(home)/utilities/page.tsx` (new): the page and its tiles.
- `components/pages/utilities/heat-graph-preview.tsx` (new): the sample year, built after hydration because it follows the visitor's date.
- `components/pages/utilities/copy-install.tsx` (new): the package name that copies its install command.

When folding back: copy the three files to the same paths in `apps/docs`.

## Platforms page (2026-11-25)

A new page at `/platforms`, in the same style as `/utilities`: a headline and short deck, then a framed 2×2 grid with hairlines between the tiles. Platforms and Starters stay separate pages: four platforms against about fifty starters, and design.md treats platforms as ways to install the library rather than a product line.

- React: the Thread demo from `/demos`, answering from its script.
- React Native: the hosted Expo demo the `/native` page embeds, in a phone-shaped frame.
- Ink: the hosted terminal demo the `/ink` page embeds.
- Vue: the Vue quickstart's `Assistant.client.vue`, highlighted, since there is no hosted Vue demo.

Under each preview: the package name (pressing it copies `npm install` for it), the title linking to that platform's page (`/docs`, `/native`, `/ink`, `/docs/vue`), one line from that page, and "Start from" links to the platform's templates and examples on GitHub, taken from the library's Starters. The iframes load after hydration and lazily.

Files:

- `app/(home)/platforms/page.tsx` (new, since moved to `app/(home)/(platforms)/platforms/page.tsx`): the page and its tiles.
- `components/pages/platforms/live-frame.tsx` (new): a hosted demo in an iframe.

When folding back: copy both files to the same paths in `apps/docs`; the page also uses `components/pages/utilities/copy-install.tsx` and `components/demos/thread.preview.tsx` from this app.

## A page per platform, in a (platforms) route group (2026-11-25)

Each platform now has its own page, kept together in the route group `app/(home)/(platforms)/` so the folder groups them without adding `/platforms` to their addresses: `/react`, `/react-native`, `/ink`, and `/vue`. The `/platforms` overview moved into the same group (its address is unchanged) and its tiles link to these four pages.

- `/ink`: the docs `/ink` page, copied, with the live terminal demo.
- `/react-native`: the docs `/native` page, copied, with the live Expo demo, at a new address.
- `/react` (new): the same shape as those two. The Thread demo answering from a script, the setup from the manual installation guide, the 17 React primitives, and three notes (any backend, styled or unstyled, shared runtime).
- `/vue` (new): the same shape, with the Nuxt quickstart's component and route as its figure (there is no hosted Vue demo), the 11 Vue primitive groups, and three notes.

They use the site's own header and footer, not the docs' sub-project header. Each page's footer links to the other three.

Files:

- `app/(home)/(platforms)/platforms/page.tsx` (moved from `app/(home)/platforms/page.tsx`): tile links.
- `app/(home)/(platforms)/ink/page.tsx`, `terminal-demo.tsx` (copied from `apps/docs/app/(products)/ink/`): metadata on the page, footer links.
- `app/(home)/(platforms)/react-native/page.tsx` (copied from `apps/docs/app/(products)/native/page.tsx`) and `layout.tsx` (metadata): footer links.
- `app/(home)/(platforms)/react/page.tsx` and `app/(home)/(platforms)/vue/page.tsx` (new).

When folding back: in `apps/docs`, these replace `app/(products)/native` and `app/(products)/ink` (decide whether they keep `SubProjectLayout`), `/native` needs a redirect to `/react-native`, and `PLATFORM_LINKS` in `lib/constants.ts` changes to the four new addresses.

## Skills hero with an MCP panel, agents with icons and menus (2026-11-25)

The `/skills` hero now follows the home page's: under the deck, a "Read the docs" button (to `/docs/llm`) and the copyable `npx skills add assistant-ui/skills`. Beside it, as Vercel puts a demo in each page's hero, an MCP panel:

- A header with the server address (`https://www.assistant-ui.com/mcp`) and a copy button.
- Connect: a picker for Claude Code, Cursor, VS Code, Windsurf, Zed, and Claude Desktop, showing the file or terminal, the setup from the MCP section of `/docs/llm`, a copy button, and the one-line follow-up step (Cursor also gets its "Add to Cursor" link).
- Try it: a search box that calls the server's real `search_docs` tool over MCP (a JSON-RPC `tools/call` to `/api/mcp`, which this app forwards to the docs server) and lists the top four pages, each linking to it. Four example queries start a search in one click.

The agent marquee is gone. "Works in 79 agents" keeps its list, now with each agent's icon (the library's mark) and the library's plus menu (Add to cart, Copy install command, Copy assistant-ui prompt) instead of a row that copied on click. Codemaker and Neovate have no icon in the library, so they show their first letter. One `LibraryProvider` and cart sheet now wrap the whole page, so the skills' and the agents' menus share one cart.

Files:

- `components/pages/skills/mcp-panel.tsx` (new): the MCP panel.
- `components/pages/skills/agent-list.tsx` (new): the agents with icons and menus.
- `components/pages/skills/skill-list.tsx`: `SkillsLibrary` (provider and cart sheet), `SkillList` without its own provider.
- `app/(home)/skills/page.tsx`: the hero, the panel, the lists inside `SkillsLibrary`.
- `components/pages/skills/copy-command.tsx`: `CopyRow` removed.
- `components/pages/skills/agent-marquee.tsx` and the `skills-agent-marquee` keyframes in `app/globals.css`: removed.

When folding back: in `apps/docs` the panel can call `/mcp` directly (same origin); copy the skills files to the same paths.

## MCP panel redrawn on the home demo's frame (2026-11-25)

ellie found the first MCP panel "really ugly": a bordered header strip, a bordered tab strip, a row of client buttons that ran out of room, and a tinted box inside the bordered box. It now uses the frame ellie approved for the home demo: segmented tabs above (Connect, Search the docs) with the server address and its copy button on the same row, one lifted frame below, and a caption line under it.

- Connect: the frame's header row holds a dropdown for the coding agent (Claude Code, Cursor, VS Code, Windsurf, Zed, Claude Desktop), the file or "Terminal", and copy; the setup fills the rest. The caption is that agent's follow-up step, with "Add to Cursor" on its right for Cursor.
- Search the docs: the header row is the search field; four example searches sit below it until you search, then the top four pages from the real `search_docs` tool. The caption says the results are live.

The blue live dot on the tab is gone, and the frame is one fixed height (17rem) so switching agents or tabs doesn't move the hero.

Files:

- `components/pages/skills/mcp-panel.tsx`: the new layout; the setups and the search call are unchanged.

When folding back: as in "Skills hero with an MCP panel".

## MCP panel: agent icons, highlighted setups, the Cursor link (2026-11-25)

- Each coding agent in the panel's dropdown, and the one picked in its header, shows its icon: the library's agent marks for Claude Code, Cursor, GitHub Copilot, Windsurf, and Zed, and the Claude mark for Claude Desktop.
- The VS Code option is now "GitHub Copilot": the repo has no VS Code mark, and the setup is for Copilot Chat in VS Code (its note says so).
- The setups are highlighted with Shiki (bash for the terminal command, JSON for the config files) in the GitHub themes the rest of the site uses, following light and dark.
- "Add to Cursor" now looks and moves like "Read the source": muted text with an up-right arrow that nudges on hover (off for reduced motion).
- The server address and its copy button stay.

Files:

- `components/pages/skills/mcp-panel.tsx`: icons, `DeferredHighlight`, the Cursor link.

When folding back: as in "Skills hero with an MCP panel".

## A design-pages skill for this app (2026-11-25)

A project skill at `.claude/skills/design-pages/SKILL.md` collects ellie's page rules so every page here is built the same way. Its hero rule is ellie's: a title, one deck line, and exactly two `size="lg"` buttons, the main one first and then either the install command or a secondary action as a `ghost` button with a visible border; and always an interactive demo on the right, framed like the home demo. The rest records what ellie settled while building `/skills`, `/utilities`, and `/platforms`: the hairline-framed grid for packages, library rows with the plus menu for installable items, an icon on every product or agent option, highlighted code, the nudging arrow on secondary links, destructive remove actions, compact dialogs, and a dropdown instead of a row of buttons that runs out of room. `AGENTS.md` points to it.

The home hero's `HeroCta` already follows the button rule (both `lg`, "Talk to the team" with a visible border); that change came with the commit before this entry.

Files:

- `.claude/skills/design-pages/SKILL.md` (new).
- `AGENTS.md`: a line pointing to the skill.

When folding back: the skill stays in this app unless its rules move into `apps/docs/content/design.md`.

## Every page's hero on PageHero, with a demo beside it (2026-11-25)

ellie's answers to the skill's questions: a hero is the title with an optional line under it (it may go later), the demo goes under the buttons on a phone, a page ends with its last section (no closing band), and every existing page follows the rules now.

Three shared pieces hold the rules, so a page cannot drift from them:

- `PageHero` (`components/shared/page-hero.tsx`): the title, the optional line, a `lg` main button, then a `lg` bordered ghost button that is either the install command or a secondary link, and the demo on the right.
- `InstallButton` (`components/shared/install-button.tsx`): the install command as that bordered ghost button; it copies and shows a check.
- `DemoFrame` (`components/shared/demo-frame.tsx`): the home demo's frame (controls above, one lifted frame, one caption line) and its `LIFT_SHADOW`.

Each page's hero now:

- `/skills`: Read the docs, the skills install command, the MCP panel.
- `/utilities`: Open in the library, Source on GitHub, and the docs' DevTools sample (a sample chat whose launcher opens the real DevTools panel).
- `/platforms`: Read the docs, `npx assistant-ui@latest create my-app`, and one demo with a tab per platform (each with its glyph): the Thread for React, the hosted Expo and Ink demos, and Vue's quickstart component. The grid tiles below lost their previews, since the hero now runs them, and show the platform's glyph instead.
- `/react`, `/react-native`, `/ink`: Read the docs, the platform's create command, and its live demo (the Thread, the Expo build, the Ink terminal) in a `DemoFrame`. The Ink terminal moved up from under the hero.
- `/vue`: Read the docs, `npm install @assistant-ui/vue`, and a code demo with a tab per quickstart file and a copy button, because there is no hosted Vue demo to run; its caption says so. The two code blocks that used to sit under the hero are gone.

Files:

- `components/shared/page-hero.tsx`, `install-button.tsx`, `demo-frame.tsx` (new).
- `components/pages/platforms/platforms-demo.tsx`, `code-files-demo.tsx` (new).
- `app/(home)/skills/page.tsx`, `app/(home)/utilities/page.tsx`, and every page in `app/(home)/(platforms)/`.
- `components/pages/skills/mcp-panel.tsx`: uses the shared `LIFT_SHADOW`.
- Removed: `components/pages/skills/copy-command.tsx` and `app/(home)/(platforms)/ink/terminal-demo.tsx`, which nothing used any more.

When folding back: the three shared pieces go to the same paths in `apps/docs`; the platform pages replace the docs `(products)` pages as in "A page per platform".

## Code follows the token sheet's code theme everywhere (2026-11-25)

ellie set a code theme in the token sheet and the Skills page's MCP panel ignored it. Two causes:

- The sheet found Shiki spans by `style*="--shiki-light:#hex"`. Server-rendered Shiki writes that, but code highlighted in the browser is styled by React, which writes `--shiki-light: #hex` with a space, so the MCP panel and the code demos never matched. The sheet now matches both spellings.
- In dark mode the kit's `CodeBlock` colors spans with a layered `!important` from `--shiki-dark`, which beats the sheet's unlayered `color`. The sheet now also sets `--shiki-light` and `--shiki-dark` on the spans it recolors.

The platform pages' setup blocks used the docs `Highlight`, in Catppuccin, which the sheet does not know. This app's copy of `Highlight` uses the GitHub themes, so every `Highlight` here follows the sheet too. Checked with the AI Ellie preset (Nord) on `/skills`, `/utilities`, `/react`, and `/vue`, in light and dark.

Files:

- `lib/tokens.ts`: `shikiSpans` (both spellings) and the variable overrides.
- `components/shared/highlight.tsx` (copied from docs, then changed): GitHub themes with `defaultColor="light-dark()"`.
- `.claude/skills/design-pages/SKILL.md`: the code rule says why it must be the GitHub themes.

When folding back: the docs keep Catppuccin in `Highlight` unless the code theme setting moves to the docs too; `lib/tokens.ts` is a dev tool of this app.
