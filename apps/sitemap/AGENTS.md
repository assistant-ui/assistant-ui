# @assistant-ui/sitemap-app

A working copy of parts of the docs site (`apps/docs`) for redesigning pages without touching it; the root AGENTS.md and `apps/docs/AGENTS.md` still apply.

## Commands

- Run the docs dev server on port 3000 and this app with `pnpm -C apps/sitemap dev` on port 3013, because API calls, the docs public assets, and any page not copied here are served by the docs server.
- Typecheck with `apps/sitemap/node_modules/.bin/tsc --noEmit` and lint with the root `oxlint` and `oxfmt`, which avoids a `pnpm` run racing the dev server.

## Rules

- Edit only files in `apps/sitemap`; ask before changing anything outside it, `apps/docs` included.
- Change a docs file by copying it to the same path here and editing the copy, because `tsconfig.json` resolves `@/*` here first and then in `../docs`, and the same path keeps it easy to fold back.
- Record every change as a `## Title (YYYY-MM-DD)` section in `CHANGES.md`, with a `Files:` list and a `When folding back:` paragraph, and keep its `## To do` list current, because `/changes` renders that file.
- Read `apps/docs/content/design.md` before drawing anything, because its shape, color, type, copy, line, and motion rules apply here unchanged.
- Build design alternatives as live variants with the `variants` skill (`@assistant-ui/variants` as a dev dependency) rather than describing them, and remove the variants and the dependency once one is chosen.
- Verify a change in the browser at desktop and phone widths before calling it done.
- Turn every new animation off under `prefers-reduced-motion`, because design.md requires it.
- Keep development tools (the token sheet, react-grab) behind `NODE_ENV === "development"`.
- Commit a finished change and push it to `feat/sitemap-app` without naming Claude as an author or co-author, and open no pull request unless asked.
