# assistant-ui docs site

The site at assistant-ui.com. Run it from the repo root with `pnpm docs:dev`.

## Low-RAM machines

A full `pnpm docs:dev` compiles all ~670 MDX pages the first time you open a docs page. That alone can take 7 GB or more, because Turbopack starts one loader process per CPU core.

Use lite mode instead:

```sh
pnpm docs:dev:lite
```

Lite mode compiles a page only when you open it. The first visit to a page shows a short "Compiling this page" note and then loads the page. Navigation and search still list every page. Pages you have opened are remembered in `.source/lite-pages.json`; delete it to start fresh. Routes that read many page bodies at once, such as `/llms-full.txt`, get the placeholder text for pages you haven't opened. The `.md` routes, MCP and the docs chat tools get it the first time they read a page.

To cap memory during `pnpm build`, limit the prerender workers:

```sh
DOCS_BUILD_CPUS=4 pnpm build
```

Neither setting changes what a build produces.
