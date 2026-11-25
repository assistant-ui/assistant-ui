# Changes from the docs site

This app is a working copy of parts of `apps/docs`, for redesigning the site without touching it. Files here sit at the same paths as in `apps/docs`, and a file here wins over the docs file at the same path (`tsconfig.json` resolves `@/*` here first, then in `../docs`). To fold a change back, copy the file to the same path in `apps/docs`, then apply the "When folding back" notes below.

Run it with `pnpm -C apps/sitemap dev` (port 3013) while the docs dev server runs on port 3000: API calls, the docs site's public images, and any page not copied here go to it.

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
