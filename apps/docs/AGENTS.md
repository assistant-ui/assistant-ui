# @assistant-ui/docs

The documentation site; the root AGENTS.md still applies.

## Commands

- `pnpm generate:api-reference -- --strict` regenerates `content/docs/(reference)/api-reference/` the way the API Reference Drift job does, and that job fails when the run leaves a diff.

## Rules

- Never hand-edit a page carrying `{/* AUTO-GENERATED PAGE by scripts/generate-api-reference.mts */}` outside its `api-manual`, `api-manual:<export>`, or `api-example:<export>` slots, because the next run rewrites it; durable prose belongs in the source JSDoc.
- Put `{/* api-reference:skip-auto-generation */}` right after the frontmatter of a hand-maintained page under `api-reference/`, or `--strict` fails it as an unmanaged stale page.
- Never hand-edit a `meta.json` under `api-reference/`; the generator writes them.
- When moving a folder under `app/`, also fix the `@/app/<folder>` imports in `content/**/*.mdx`, because Vercel builds the docs only after a merge and tsc skips MDX.
