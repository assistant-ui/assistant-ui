---
name: design-pages
description: Design or redesign a page in the sitemap app (apps/sitemap) - its hero, the interactive demo beside it, the sections under it, and the controls and copy on it. Use before building or changing any page in this app, together with apps/docs/content/design.md.
---

# Designing pages in the sitemap app

These are ellie's decisions for pages in this app. `apps/docs/content/design.md` still applies whole; where this file is more specific, follow this file, and say so in the page's `CHANGES.md` entry so it is settled when the page folds back into `apps/docs`.

## Two kinds of page

- A subject page is about one thing a reader can install or use: a platform (`/react`, `/ink`), a utility (`/heat-graph`), a block. Its hero is the copy alone, and its demo is the page's main focus: a full-width row right under the hero (`PageHero`'s `showcase`), a `DemoSetupPanel` with the live demo first and its setup second.
- An overview page collects many things: the home page, `/utilities`, `/platforms`, `/demos`. Its hero aside is `InstallTerminal` (`components/shared/install-terminal.tsx`): a tab per item that types the item's real install or create command, then shows its next step from its docs and the item running where it can, advancing on its own until the reader picks a tab. Never print invented install output (package counts, timings). A page whose items are sections of one page rather than things to install (`/skills`) uses `OverviewIndex` instead.

## The hero

Every page opens with a hero built with `PageHero` (`components/shared/page-hero.tsx`). On an overview page the copy sits on the left and the aside on the right (under the buttons on a phone). On a subject page the copy stands alone and the demo follows as its own full-width row (`showcase`).

Left column, in this order and nothing else:

1. The title, `typePage`: one sentence that says what the subject does, not its name.
2. Optionally one line under it, `typeDeck`, taken from the subject's own docs page when it has one. ellie may drop these lines later, so a hero must read well without it.
3. Exactly two buttons in a row, both `size="lg"`:
   - The main action: `<Button size="lg">`, linking to where the reader goes next (the docs, the library).
   - Then either the install command or a secondary action, both `variant="ghost"` with a visible border (`className="border-border"`). The install command (`InstallButton`) is set in mono and copies on click, with a copy icon that turns into a check. A secondary action is a link with an arrow that nudges on hover.

References: `PageHero`, `InstallButton` (`components/shared/install-button.tsx`), and `HeroCta` in `components/pages/home/hero.tsx`.

The subject page's showcase row: a two-view panel, the live demo first and its setup second (segmented tabs above the frame: the demo, then the setup code with copy), so the reader can try it and then see what it takes. It is always an interactive demo of the page's subject, the real thing running (a live component, a hosted demo, a real API call), never a picture or a script presented as live. When nothing can run on the page (Vue has no hosted demo), show the real setup code with a way to switch files and copy, and say what it is in the caption. Frame it like the home demo, with `DemoFrame` (`components/shared/demo-frame.tsx`):

- Segmented tabs above the frame when there is more than one view, with anything that belongs to the whole demo (an address, a copy button) on the same row.
- One lifted frame: `rounded-document border border-foreground/10 bg-background` with the inline lift shadow from `components/pages/home/demo/index.tsx`.
- Inside it, at most one header row over a hairline, then the content. No box inside the box, no stacked bars.
- One caption line under the frame: muted text on the left, an optional link on the right.
- A fixed height, so switching views or options does not move the hero.

References: `components/pages/home/demo/index.tsx`, `components/pages/skills/mcp-panel.tsx`.

Don't show the same live demo twice on a page: when the hero holds it, the sections below link to it or describe it instead.

## Under the hero

- A page with a few kinds of thing gives each its own `PageSection` (`components/shared/page-section.tsx`): the title and a line on the left, a small interactive panel on the right (a picker in the frame's header row and what it shows), then the section's full list. Reference: `/skills` (Skills, MCP, Agents).

- A set of packages or products: one framed grid with hairlines between the tiles (`border-t border-l` on the grid, `border-r border-b` on each tile). Each tile has a preview on top, then the package name (pressing it copies the install command), the title linking to the item's page with an arrow, and one line. Reference: `app/(home)/utilities/page.tsx`.
- A list of items people can install or add: library rows with the item's mark or glyph, its name, one line, and the library's plus menu (`ItemMenu`). A page with add-to-cart wraps its lists in one `LibraryProvider` and one `CartSheet`. Reference: `components/pages/skills/`.

- The page ends with its last section. No closing call-to-action band.

## Controls

- Every option that names a product, agent, or platform shows its icon: the library's marks (`components/library/agent-icons.tsx`, `item-mark.tsx`) or `@/components/icons/*` (the docs app's icons). Ask before downloading a logo that is not in the repo.
- Highlight every code sample in the GitHub themes, because the token sheet's code theme recolors Shiki output by its github-light colors: `highlightElementSource` on the server, `Highlight` (`components/shared/highlight.tsx`) or `DeferredHighlight` with `theme={{ light: "github-light", dark: "github-dark" }}` and `defaultColor="light-dark()"` on the client. Never pick another Shiki theme, and check a new code sample with a non-GitHub code theme in the sheet.
- A secondary link is muted text with `ArrowRight` (inside the site) or `ArrowUpRight` (outside it) that nudges on hover and stays still for reduced motion.
- An action that removes something uses `variant="destructive"`.
- Keep dialogs compact: at most `sm:max-w-xl`, `p-3 sm:p-4`, `gap-3`, the long content scrolling inside.
- Pick from many options with a dropdown in the frame's header row, not a row of buttons that runs out of room.

## Before calling a page done

- Check it in the Browser pane at desktop width and with the mobile preset, in light and dark, with no horizontal scroll.
- Add a `CHANGES.md` entry and keep its To do list current.
