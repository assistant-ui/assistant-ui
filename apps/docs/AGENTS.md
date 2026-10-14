# @assistant-ui/docs

The documentation site; the root AGENTS.md still applies.

## Commands

- `pnpm generate:api-reference -- --strict` regenerates `content/docs/(reference)/api-reference/` the way the API Reference Drift job does, and that job fails when the run leaves a diff.

## Rules

- Read `content/design.md` before drawing a surface or writing a string on one, because it owns the shape, color, type, copy, and line rules for the site.
- Never hand-edit a page carrying `{/* AUTO-GENERATED PAGE by scripts/generate-api-reference.mts */}` outside its `api-manual`, `api-manual:<export>`, or `api-example:<export>` slots, because the next run rewrites it; durable prose belongs in the source JSDoc.
- Put `{/* api-reference:skip-auto-generation */}` right after the frontmatter of a hand-maintained page under `api-reference/`, or `--strict` fails it as an unmanaged stale page.
- Never hand-edit a `meta.json` under `api-reference/`; the generator writes them.
- When moving a folder under `app/`, also fix the `@/app/<folder>` imports in `content/**/*.mdx`, because Vercel builds the docs only after a merge and tsc skips MDX.
- Wrap a docs sample that builds its own runtime in `SampleScope`, because every `/docs` page renders inside `DocsRuntimeProvider` and a nested thread list throws.
- Never await an npm or GitHub read at the top of a prerendered page; read it in a `"use cache"` function with an explicit `cacheLife`, or behind `Suspense` after `connection()`, because a non-200 build response is never cached and fails the prerender.
- Call `await connection()` before a GET route handler reads secrets or runtime config, because the handler otherwise prerenders with the build env, which withholds undeclared secrets.
- Verify a docs change with the app's `pnpm build` (a bare `next build` skips the source snapshot and trace checks) and both production flags set (`NEXT_PUBLIC_AUI_AI_PLAYGROUND_ENABLED=1`, `NEXT_PUBLIC_WEBMCP_ENABLED=1`), because no pull request builds the docs.
- Quote a frontmatter value that contains a colon followed by a space, because CI never compiles MDX.
