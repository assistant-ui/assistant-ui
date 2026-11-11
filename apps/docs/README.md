# assistant-ui docs site

The site at assistant-ui.com. Run it from the repo root with `pnpm docs:dev`.

## Dev modes

`pnpm docs:dev` compiles a docs page only when you open it. The first visit to a page shows a short "Compiling this page" note and then loads the page. Navigation and search still list every page. Pages you have opened, or that a route has read, are remembered in `.source/lite-pages.json`; delete it to start fresh.

The `.md` routes, MCP and the docs chat tools get the placeholder text the first time they read a page they haven't seen. Routes that read many pages at once, such as `/llms-full.txt`, record only the first few and get the placeholder for the rest. To test those end to end, compile every page up front:

```sh
pnpm docs:dev:full
```

That needs a lot more memory, because Turbopack runs about one MDX loader process per CPU core.

### Low-RAM machines

```sh
pnpm docs:dev:lite
```

Lite mode also:

- uses the built SDK packages (`packages/*/dist`) instead of compiling their sources. The root script builds them first. After editing a package, rebuild it (`pnpm turbo run build --filter=<package>`); its changes do not hot reload.
- shows a "Load demo" button in place of the home page demo and the playground. Clicking it compiles the demo and reloads the page. Loaded demos are remembered in `.source/lite-demos.json`.
- turns off Turbopack source maps, so stack traces and browser devtools show compiled code.
- turns off Turbopack's persistent cache, so each restart compiles the pages you open again.

To cap memory during `pnpm build`, limit the prerender workers and Turbopack's MDX loader processes:

```sh
DOCS_BUILD_CPUS=4 pnpm build
```

On an 18-core machine, a default build peaks at about 27 GB and takes about 45 s. With `DOCS_BUILD_CPUS=4` it peaks at about 16 GB and takes about 55 s. The PR that added this (assistant-ui/assistant-ui#10486) has the measurements.

None of these settings change what a build produces.
