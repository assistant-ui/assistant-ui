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
