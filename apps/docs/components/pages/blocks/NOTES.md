# Blocks notes

Things ellie wants to change or do on the Blocks pages, kept in one place.

**Rule: nothing under "Later" is started unless ellie asks for it.** These wait until ellie is happy with the page's design and features. Agents: do not begin, prepare, or partly build any of them on your own.

## Later

- **A preview that works on the live site.** Today the docs dev server starts the block on a local port (`block-preview.ts`), and the live site shows the screenshot. This is a stopgap. Fix it by deploying the block and setting `previewUrl` in `lib/blocks.ts`, or by building the block into the docs site.
- **Blocks in the registry.** Make a block installable with one CLI command, the way Elements are.
- **Icons in the theme picker.** The picker changes mode, color, radius, font and text size. Swapping the icon set means rewriting the block's icon imports and adding icon packages.
- **The picked theme in the Code tab.** The picker restyles the preview only; the code shown is the block's own.
- **A link to Blocks in the site header, and a sitemap entry.** The pages are reached only by typing `/blocks` for now.

- **The viewer rebuild.** Planned and answered, then parked for the first block: shadcn's layout (Preview / Code, description, desktop / tablet / mobile, open in a new tab, reload, file tree, path and copy, line numbers) in the docs site's colours, fonts and corners; a live switch between the aiellie and assistant-ui themes; one shared `aiellie.css` beside the blocks; four restyled sections (Use cases, Capabilities, Dependencies, Requirements with env vars inside); `primitives-chat` kept until then; the Base and agent document editor blocks removed with their screenshots, the three example lines in `next.config.mts` and the theme script in `examples/with-agent-document-editor/app/layout.tsx`.
- **Block API routes that really run.** For now a preview uses scripted replies and the block's `route.ts` answers 404 on the site unless `BLOCKS_LIVE_API` is `true`. ellie may want the real route later.
- **Two icon sets in one file.** Each block picks Lucide or Hugeicons through its own `Icon` helper. Look at this again now that the first block exists.
- **Generative frame chat.** Outlined in its folder's `README.md` and listed in `UPCOMING_BLOCKS` in `lib/blocks.ts`, which shows an Upcoming card with no page. Building it means moving the entry into `BLOCKS` with screenshots. Open questions are at the end of the README.
- **Document editor, still open.** Image block with Generate and Attach, a comments side panel, web links, nested lists, undo for a title change, and trying `api/chat/route.ts` with a real key. The block is at 24 files; the cap is 25.

## Adding a demo block

A demo block is a small app inside the docs, in its own folder under `app/(blocks)/blocks/demos/`. The folder sits beside `(home)` so the block's page has no site header, and its address is `/blocks/demos/<slug>`.

1. Make the folder in the block format: `page.tsx`, `layout.tsx` (fonts and the block's root element), `<slug>.tsx` (the main component), `<slug>.css` (styles scoped to that root), `data.json` (sample content), `api/<route>/route.ts`, `README.md`, `.env.example`. Add `components/` and `lib/` only when one file would be too long, and say so.
2. Add the block to `lib/blocks.ts` with `previewUrl: "/blocks/demos/<slug>"` and the folder as `source.directory`. Name `.env.example` in `include`; the folder walk skips dotfiles.
3. Add `public/screenshot/blocks/<slug>-light.webp` and `-dark.webp`.
4. Add the preview address to `BLOCK_PREVIEW_PATHS` in `lib/embedded-paths.ts`, so the site's cookie banner and Ask AI ball stay out of the preview.

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
- Demo blocks: a block can live in the docs app, in its own folder under `app/(blocks)/blocks/demos/`, with its own page, layout, CSS and components. Its preview is its own page, so it needs no port.
- Primitives chat, the first demo block: a chat that uses all 17 assistant-ui primitives, with scripted replies, set in Geist.
- Primitives chat styling: shadcn neutral theme, hand cursor on anything clickable, and Hugeicons in place of lucide.
- Primitives chat icon buttons: round ghost buttons with a press effect, a copy icon that swaps to a green tick, and a tooltip on every icon button.
- Primitives chat: composer on the background color with a light border and shadow, and a sidebar you can resize or hide (button and ⌘B).
- Primitives chat uses every primitive part that works with its scripted runtime: dictation, the @ and / popovers, grouped parts, a card built from data, a sub-agent's messages, Resume on an interrupted reply, older chats loaded a page at a time, and a second group in the More menu. Left out because they need another runtime or Assistant Cloud: `ActionBarPrimitive.RefreshRun`, `ComposerPrimitive.Resume`, `ThreadPrimitive.LoadEarlier`. Left out because they are deprecated names for parts already used: the `If` parts, `ThreadPrimitive.Empty`, `MessagePrimitive.Content`, the `Unstable_` aliases. Not added yet because each needs a new area on screen: `ThreadPrimitive.Row` and `ViewportProvider`, the `ByIndex` parts, `Unstable_MessageById`, `Unstable_PartsGrouped`.
- Document editor, the first block in the block format: a page editor on Lexical with the Assistant Modal as a bar at the bottom that opens into a thread and edits the page. It has checklists, headings, lists, quotes and dividers; a toolbar on selected text; a `/` menu; a grip on each block to drag it or open its menu; comments on highlighted text with assistant replies; pages and subpages; template chips on an empty page; Markdown download. Replies are scripted from `data.json`.
- Document editor, round two. The assistant bar collapses to a round button with a blue dot for anything unseen, resizes by its edges, and has History (the thread list), dictation, add files and an Auto / Manual menu. In Manual an edit lands highlighted with Undo, Ask for change and Accept. An "Assistant" flag marks where it is writing. Tables with row and column menus, Turn into and Copy link on the grip, Ask AI on selected text, `@` to link a page, an emoji and icon picker, the outline rail, reactions on comments, comments from the assistant, avatars, follow-up suggestions after an edit, and a Welcome page that walks through all of it. The brand blue is assistant-ui's `blue-500`.
- Block previews no longer show the site's cookie banner or Ask AI ball.
- Block cards show what the block is built with as a group of overlapping round marks at the right end of the title. The mark under the pointer lifts, the others part, and its name shows. The list is `stack` in `lib/blocks.ts`, four at most, on Upcoming cards too; a new mark goes in `package-icon.tsx`.
- Base, the second demo block: the docs Base example rebuilt in its own folder with the block design (Geist, the one scale, Hugeicons, trace lines, quote bar). It keeps the assistant-ui components for markdown, attachments, the thread list, the model picker and the @ and / popovers, and runs on the docs chat runtime.
