# Blocks notes

Things ellie wants to change or do on the Blocks pages, kept in one place.

**Rule: nothing under "Later" is started unless ellie asks for it.** These wait until ellie is happy with the page's design and features. Agents: do not begin, prepare, or partly build any of them on your own.

## Later

- **A preview that works on the live site.** Today the docs dev server starts the block on a local port (`block-preview.ts`), and the live site shows the screenshot. This is a stopgap. Fix it by deploying the block and setting `previewUrl` in `lib/blocks.ts`, or by building the block into the docs site.
- **Blocks in the registry.** Make a block installable with one CLI command, the way Elements are.
- **Icons in the theme picker.** The picker changes mode, color, radius, font and text size. Swapping the icon set means rewriting the block's icon imports and adding icon packages.
- **The picked theme in the Code tab.** The picker restyles the preview only; the code shown is the block's own.
- **A link to Blocks in the site header, and a sitemap entry.** The pages are reached only by typing `/blocks` for now.

## Adding a demo block

1. Make a folder under `app/(home)/blocks/demos/` with the demo's files. The main file default-exports the component.
2. Add the component to `app/(home)/blocks/demos/index.ts` under the block's slug.
3. Add the block to `lib/blocks.ts` with `previewUrl: "/blocks-preview/<slug>"` and the folder as `source.directory`.
4. Add `public/screenshot/blocks/<slug>-light.webp` and `-dark.webp`.

## Done

- Blocks page and block page, with the Preview / Code viewer and six sections.
- Block address is `agent-document-editor`, without the folder's `with-` prefix.
- Preview follows the site's light or dark theme.
- Viewer controls: desktop, tablet, mobile, refresh, open in a new tab, full screen.
- File tree header with the block's name, and taller tree rows.
- Local preview starts by itself when the docs run locally.
- Theme picker for the preview: mode, color, radius, font, text size, reset.
- Section designs picked from options: Use cases as numbered rows, Capabilities and Requirements as boxed cells, Dependencies as lined columns with each package's logo, Environment variables as the `.env.example` file.
- "From assistant-ui" section: the hooks, primitives, components, runtime pieces and types the block imports, read from its code.
- Problem solved section removed.
- Demo blocks: a block can live in the docs app, in its own folder under `app/(home)/blocks/demos/`. Its preview is the docs page `/blocks-preview/<slug>`, so it needs no port and works on the live site.
- Primitives chat, the first demo block: one file that uses all 17 assistant-ui primitives, with scripted replies.
