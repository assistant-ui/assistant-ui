# Blocks notes

Things ellie wants to change or do on the Blocks pages, kept in one place.

**Rule: nothing under "Later" is started unless ellie asks for it.** These wait until ellie is happy with the page's design and features. Agents: do not begin, prepare, or partly build any of them on your own.

## Later

- **A preview that works on the live site.** Today the docs dev server starts the block on a local port (`block-preview.ts`), and the live site shows the screenshot. This is a stopgap. Fix it by deploying the block and setting `previewUrl` in `lib/blocks.ts`, or by building the block into the docs site.
- **Blocks in the registry.** Make a block installable with one CLI command, the way Elements are.
- **Icons in the theme picker.** The picker changes mode, color, radius, font and text size. Swapping the icon set means rewriting the block's icon imports and adding icon packages.
- **The picked theme in the Code tab.** The picker restyles the preview only; the code shown is the block's own.
- **A link to Blocks in the site header, and a sitemap entry.** The pages are reached only by typing `/blocks` for now.

## Done

- Blocks page and block page, with the Preview / Code viewer and six sections.
- Block address is `agent-document-editor`, without the folder's `with-` prefix.
- Preview follows the site's light or dark theme.
- Viewer controls: desktop, tablet, mobile, refresh, open in a new tab, full screen.
- File tree header with the block's name, and taller tree rows.
- Local preview starts by itself when the docs run locally.
- Theme picker for the preview: mode, color, radius, font, text size, reset.
