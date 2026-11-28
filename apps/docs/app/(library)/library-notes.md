# Library notes

## Starters that need their own previews

VS Code (`templates/vscode`, an editor extension), React Ink (`examples/with-react-ink`, a terminal app), and Expo (`examples/with-expo`, a phone app) don't run in a browser, so they were left out of the light and dark screenshot run and keep their glyphs on the cards. They need their own way to get previews later: for example, a capture of the extension's webview inside VS Code, a recorded terminal session for Ink, and Expo's web build or a simulator capture.

## Starter data is a hand-copied snapshot

`lib/library/starters-data.ts` holds every starter on the library's Starters tab. Most of it was copied by hand or by one-off scripts, so it goes stale when a starter, the CLI, or the registry changes. Nothing checks it today.

What is copied, and from where:

- The starter list, names, and descriptions mirror `PROJECT_METADATA` in `packages/cli/src/commands/create.ts`. The docs app cannot import the CLI, so a starter added or renamed there does not show up here.
- `framework` and `runtime` tags were read from each starter's `package.json` dependencies.
- `env` comes from each starter's `.env.example` (or `.env.local.example`).
- `components`, `uiComponents`, `files`, and `dependencies` are what `create` installs. They were worked out the way the CLI and shadcn do it: scan the starter's `@/components/assistant-ui/...` and `@/components/ui/...` imports, then follow every item's `registryDependencies` through the registry (assistant-ui items from `apps/registry/dist`, shadcn/ui items from ui.shadcn.com). `dependencies` drops `@assistant-ui/ui`, which `create` removes. Default checks out against a real `npx assistant-ui@latest create my-app`: 35 files.
- `componentsIncluded` marks Minimal, Shared cloud chat, and React Ink, whose components ship inside the starter (`hasLocalComponents` in the CLI), so their files are listed from the starter folder instead of the registry.
- `devScript` is set only for Expo, which starts with `npm run start`.
- `image` points at a screenshot in `public/screenshot/examples` wherever the site's examples page (`lib/examples.ts`) pairs one with the same code: Artifacts, Expo, Interactables, React Hook Form, Generative UI, Article Assistant, the five style clones, and Base Assistant UI, which that page shows as "AI SDK" with an older capture. Each is one image, so it looks the same in light and dark mode.

When to redo it: a starter is added, removed, or renamed in the CLI; a starter's imports, `.env.example`, or `package.json` change; or a registry item's files or dependencies change.

### Examples the CLI does not offer

`REPO_EXAMPLES` in the same file lists the folders under `examples/` in the repository that `PROJECT_METADATA` leaves out. `create -e` rejects their names, so each is marked `repoOnly`: it has no install command, its agent prompt points at its folder on GitHub, and its drawer shows that folder in place of the Setup and Dependencies tabs. The table view's Installable column and the "Installs by command" filter read the same mark.

- Names are the folder names. Labels and one-line descriptions were written for the library from each README, or from the app's page when there is no README.
- `framework` and `runtime` were read from each `package.json`; `env` from each `.env.example`, leaving out lines that are commented out.
- Two folders were left out because the repository does not track them: `with-base` and `with-human-in-the-loop`.
- The frameworks and runtimes these examples added (Vite, Nuxt, Vue, SvelteKit, Svelte, SolidStart, Solid, Chrome extension; A2A, OpenCode, Pi, Flue) also show in the Starters filter menu. Pi and Flue have no mark in `filter-icons.tsx` and show their first letter.

When to redo it: a folder is added to or removed from `examples/`, or the CLI starts offering one of these, in which case it moves to the main list with its components, files, and dependencies filled in.

A fix that was tried and set aside: a `pnpm generate:library-starters` script in `apps/docs/scripts` that imports the CLI's `PROJECT_METADATA`, `scanRequiredComponents`, and registry URL helpers, resolves everything above, and writes `lib/library/starters.generated.json` for `starters-data.ts` to merge in. It reproduced the snapshot exactly. Its costs: it needs `apps/registry/dist` built first (it is gitignored), it fetches from ui.shadcn.com, it adds a generated file and a package script to the docs app, and CI would not type-check it, since the docs `tsconfig` skips top-level `scripts/*.mts`.

## Playground templates are a hand-copied snapshot

`PLAYGROUND_TEMPLATES` in `lib/library/starters-data.ts` holds the Playground group on the Starters tab. It mirrors what `getXuluxHostedTemplatesCatalog` in `lib/xulux/templates-catalog.ts` lists, without React Ink and Expo, which are already under Examples. Nothing checks it today.

- Six are the demos in `lib/xulux/demo-downloads/manifest.ts`. Each runs at `/demos/<name>`, downloads from `/api/xulux/demo-download?slug=<name>`, and has its entry file in `components/pages/examples/`. The download route answers only when the AI playground flag is on, as it is on the live site.
- Nine are hosted apps at `*.preview.bl.run` addresses copied from the catalog: the configurable Base app, five versions of the docs assistant, and three versions of the support assistant. Their source is not in this repository, so they have a preview and a download and no source link. If one of those addresses changes or goes away, the row's links break.
- Names and the docs and support one-liners are the catalog's; the demos' longer descriptions were shortened for the library.
- A playground template has no install command. Its drawer has a Download row and a Links group with Repo and Preview, and leaves out the Setup and Dependencies tabs, the table says "Download", and the "Installs by command" filter leaves it out. Under the other filters it counts as Next.js on the AI SDK.

When to redo it: a template is added to or removed from the playground catalog, or a hosted address changes.

## Statuses are judgments, not facts

`lib/library/status-data.ts` gives every starter and preset a status badge that says whether it should stay on show. It is a note for the people who keep the library: nothing reads it to hide an item, and nothing checks it.

- Live: keep it. Experimental: keep it, marked as early. Unreleased: hide it until its package is on npm. Internal: hide it, since it is a test bed or a demo and not something to start from. Review: a person should decide. Deprecated: remove it; no item has it today.
- An item not listed in the file is Live. Each listed item carries the reason, which the drawer shows.
- The reasons were read on 2026-11-27 from each example's README, whether its package is published (`private` and `version` in `packages/*/package.json`), and where a playground template is hosted.

When to redo it: a package is published, an example gets a README or leaves the repository, or someone decides one of the Review items.

## Last-updated dates are a snapshot

`lib/library/updated-data.ts` holds the "Last updated" day the Starters drawer and table view show: the day of the last commit on `main` that touched the item's code, read on 2026-11-27. Nothing checks it today, so a date is only right until that code changes again.

- A template or example uses its folder (`templates/<name>`, `examples/<name>`), a playground demo its entry file in `components/pages/examples/`, and every preset the one file they share, `components/pages/playground/presets.ts`.
- The nine hosted playground templates have no code in this repository and so no date.
- Each date is `git log -1 --format=%cs origin/main -- <path>`.
- That commit is often a change made across the whole repository, such as a dependency update, and not a change to the starter itself, so the date says when the folder last changed for any reason.

When to redo it: before a release of the library page, or whenever the dates should be current.

## Presets are a hand-copied snapshot

`lib/library/presets-data.ts` holds the Presets group on the Starters tab: the names `create --preset` takes, each one's name and line, and the colors, corners, and message side its card is drawn from. Nothing checks it today.

- The list, the colors, the corner size, and the message side mirror `PRESETS` in `components/pages/playground/presets.ts`, which is what `/playground/init?preset=<name>` serves and what the CLI's `--preset <name>` resolves to (`resolvePresetUrl` in `packages/cli/src/commands/create.ts`). A color a preset does not set is drawn in the site's own.
- The one-line descriptions were rewritten for the library.
- The install command is `npx assistant-ui@latest create my-app --preset <name>`; the agent prompt applies the same registry item with `npx shadcn@latest add`, which is what `create` runs.
- Under the Starters filters a preset counts as Next.js on the AI SDK with no screenshot, because `--preset` on its own builds on the default template.

When to redo it: a preset is added, removed, renamed, or recolored in the playground.

## MCP page data is hand-copied

`lib/library/mcp-data.ts` holds what `/library/mcp` shows. It was copied by hand, so it goes stale when the sources change. Nothing checks it today.

- The editors, their config file paths, config shapes, and "what to do next" lines mirror `MCP_CONFIGS` in `packages/cli/src/commands/mcp.ts` and the Manual Installation tabs in `content/docs/(before-you-start)/llm.mdx`. The docs app cannot import the CLI.
- The tool names are the ones in `lib/mcp-tool-definitions.ts` and `templateToolDefinitions` in `app/api/mcp/route.ts`. Their one-line descriptions come from the Available Tools table in `llm.mdx`, because the definitions' own descriptions are written for agents and are too long for a list.

When to redo it: the CLI's `mcp` command gains or changes an editor, or the hosted server adds, removes, or renames a tool.

## Docs-backed library tabs are hand-copied snapshots

`lib/library/docs-data.ts` holds what the Runtimes, Tools, Integrations, and Utilities tabs and the Primitives group on `/library` show: each page's name, one line about it, its address, and its group. Nothing reads the docs content, so the file goes stale when a page changes. Nothing checks it today.

- Names and lines were copied from each page's `title` and `description` under `content/docs`, the line cut to its first sentence.
- The groups mirror the separators in each section's `content/docs/<section>/meta.json` (Runtimes, Tools) or its subfolders (Integrations).
- Runtime names are shortened by hand ("Vercel AI SDK" for a page titled "Vercel AI SDK Runtime").
- Utilities adds four things that are not under `content/docs/utilities`: DevTools (`guides/devtools`), Safe Content Frame, Generative Frame, and Variants.

When to redo it: a page is added, removed, moved, retitled, or redescribed in one of those docs sections.

## Skills are a hand-copied snapshot

`LIBRARY_SKILLS` in `lib/library/skills-data.ts` holds every skill the library shows: its name, title, one-line summary, description, group, section headings, reference files, commands, and addresses. It was copied from what the page built out of `lib/agent-skills.generated.json`, at the skills repo commit that file pinned. The one-line summaries and the groups were written for this page and are edited in the same list.

What still comes from outside: the skill dialog fetches each SKILL.md from the site's `/.well-known/agent-skills/<name>/SKILL.md` and each reference file from the skills repo on GitHub, at the commit written into the snapshot's addresses.

When to redo it: a skill is added, removed, or renamed, its description or headings change, or the pinned commit moves.

## The agent setup prompt is a copy

`lib/library/agent-prompt.ts` is a copy of `agentSetupPrompt` from `lib/agent-setup-prompt.ts`. Starters and the saved panel build their agent prompts with it. When to redo it: the site's setup prompt or the `setup` command changes.

## Components and blocks are hand-copied snapshots

The library keeps its own copies so it does not depend on other pages' files, which are due to be removed. Nothing checks the copies today.

- `lib/library/components-data.ts` holds each element's and UI component's slug, name, and description. They were copied from `ELEMENTS` in `components/pages/elements/registry.tsx` and `DESIGN_COMPONENTS` in `components/pages/design/registry-meta.ts`.
- The same file holds the Vocabulary group: the 35 components a model can write, in the categories of `COMPONENT_CATEGORIES` in `lib/component-reference.ts`, each with the first sentence of its description in `defaultGenerativeUILibrary` from `@assistant-ui/generative-ui`. Rows link to `/elements/vocabulary#<name>`.
- It also holds the Features group: the 19 items the `/components` page lists beside its elements (the Chat Starter, the 16 guides in `lib/catalog/products/guides.ts`, Assistant Cloud, and Agent Tool), with each one's name, tagline, and address.
- The Primitives group is in `lib/library/docs-data.ts`, described above.
- `lib/library/blocks-data.ts` holds each block's slug, title, description, screenshots, stack, and use cases, copied from `BLOCKS` in `lib/blocks.ts`.
- The Routes and pages group in `lib/library/library-data.ts` mirrors three items in `apps/registry/src/registry.ts`.

What still points outside the library: every component, block, and utility row links to that item's page (`/elements/<slug>`, `/design/components/<slug>`, `/blocks/<slug>`, `/safe-content-frame`, `/generative-frame`, `/variants`), and block cards show the screenshots in `public/screenshot/blocks`. When one of those pages or folders is removed, its rows need a new address or their own detail view.

When to redo it: an element, UI component, vocabulary component, feature, primitive, or block is added, removed, or renamed.

## Install commands and agent prompts are part of the snapshots

Every item that can be saved carries its own install command and agent prompt in the data files, so the plus menu and the saved panel need nothing from outside. They were worked out the way the Library app did it:

- An element installs with `npx shadcn@latest add @assistant-ui/<registry item>`; a generative one with `npm install @assistant-ui/generative-ui zod`. Its prompt names the `setup` product when the setup catalog (`lib/catalog/element-index.ts`) knows the element, and its page otherwise.
- A UI component's command comes from the `<InstallCommand shadcn={[...]}>` line on its design page; a page without one gives source to copy, so that component has a prompt and no command.
- A feature installs with `npx assistant-ui@latest setup --products <slug>`.
- A primitive installs with `npm install @assistant-ui/react`. A runtime, tool, or utility with its own npm package installs that package; the rest are set up by following their page, so they have a prompt and no command.
- A block has a prompt that points at its folder on GitHub and no command.
- Vocabulary components ship inside `@assistant-ui/generative-ui` and cannot be added one at a time, so they have no menu.

When to redo it: a registry item, an npm package, or a `setup` product is renamed, or a design page gains or loses its install line.

## Marks before item names are hand-assigned

`lib/library/marks.ts` says what is drawn before each Runtimes, Tools, Integrations, Utilities, and MCP server item: a brand's logo, a coding agent's mark, or one of the library's line drawings. `components/pages/library/library-mark.tsx` draws them. An item with no entry shows the first letter of its name (Pydantic AI, better-auth, and Auth.js today, which have no logo in the repository).

- Logos come from `components/icons` and from the brands the starters' filter menu already draws.
- Tools and Utilities have no brands of their own, so most borrow a skill's or a tab's drawing; four utilities have their own drawings in `library-glyphs.tsx`.
- Components have no marks yet; that tab is due to be redone.

When to redo it: an item is added to one of those tabs, or a logo for a lettered item is added to the repository.

## Install lines copied from docs pages

Ten docs-backed items take their install command from the first `<InstallCommand npm={[...]}>` on their page (Langfuse, LangSmith, custom thread persistence, Mastra, Pydantic AI, Cloudflare Agents, LocalRuntime, ExternalStoreRuntime, MCP, and MCP Apps). The command sits in `lib/library/docs-data.ts` and goes stale when the page's packages or pinned versions change.
