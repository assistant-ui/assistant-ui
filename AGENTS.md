## Commands

```sh
pnpm install          # Node >= 24, pnpm 11
pnpm turbo build      # required once after install — packages import each other's dist/ outputs
pnpm lint             # oxlint + oxfmt --check
pnpm lint:fix         # autofix both
pnpm test             # turbo test (vitest per package) + test:types (tsc --noEmit per package)
```

Scope work to a single package with turbo filters, or run vitest from inside the package:

```sh
pnpm turbo build --filter=@assistant-ui/react                # build one package + its deps
cd packages/react && pnpm vitest run src/tests/foo.test.ts   # single test file
cd packages/react && pnpm vitest run -t "test name"          # single test by name
cd packages/react && pnpm test:watch
```

Docs site: `pnpm docs:dev`. Examples: `cd examples/<name> && pnpm dev` (build packages first — examples consume their dist outputs).

## Monorepo layout

- `packages/*` — published npm libraries. Built with `aui-build` (from `@assistant-ui/x-buildutils`), tested with vitest.
- `apps/*` — deployed, never published: `docs` (assistant-ui.com), `registry` (shadcn registry), devtools extension/frame.
- `examples/*` — runnable demos. They resolve `@/components/assistant-ui/*` to `packages/ui` via tsconfig paths, so they must not carry local copies of those components.
- `templates/*` — starter templates used by the CLI. Shared components must stay byte-equal with the canonical source in `packages/ui/src/components/assistant-ui`; `pnpm sync-templates` checks, `bash scripts/sync-templates.sh --write` fixes drift.
- `python/*` — uv-managed Python packages (e.g. the `assistant-stream` server library); not part of the pnpm workspace.

## Architecture

```
@assistant-ui/tap          → Reactive primitives inspired by React hooks (resource, useResource)
@assistant-ui/store        → Bridges tap with React (useAui, useAuiState, AuiProvider)
@assistant-ui/core         → Shared primitives and types for React + React Native
@assistant-ui/react        → Web distribution (re-exports core + adds Radix primitives)
@assistant-ui/react-native → RN distribution (re-exports core + adds RN primitives)
@assistant-ui/react-ink    → Ink/terminal distribution
assistant-stream           → Streaming wire protocol (TypeScript side; python/assistant-stream is the Python counterpart)
```

Integration packages (`react-ai-sdk`, `react-langgraph`, `react-a2a`, `react-ag-ui`, …) adapt third-party backends and build on top of `@assistant-ui/react`.

## Changesets

Every PR that changes a published package needs a changeset. Always use **patch** — minor/major require maintainer approval. Private packages (`@assistant-ui/docs`, `@assistant-ui/shadcn-registry`) are exempt.

```md
---
"@assistant-ui/react": patch
---

feat: description of the change
```

## Lint / format (oxlint + oxfmt)

Lint with `pnpm lint`, autofix with `pnpm lint:fix`. Backed by `.oxlintrc.json` (oxlint) and `.oxfmtrc.json` (oxfmt).

Resources use React's hooks, so dependency arrays and hook rules are checked by oxlint's native `react/exhaustive-deps` and `react/rules-of-hooks`. For these to lint a body, the hook must be named so React recognizes it: extract resources as a `use`-prefixed hook (`const useFoo = () => {…}; const Foo = resource(useFoo)`), and pass `useTapRoot`/`createTapRoot` a named function expression (`createTapRoot(function FooRoot() {…})`) rather than an arrow.

## Code comments

When you change code, delete any comment that only records its history.

## GitButler

If the current branch is `gitbutler/workspace`, the user uses GitButler, not Git, as version control. Do not create branches, stage files, commit, or rewrite history with Git commands unless the user explicitly asks.

Assume other coding agents are working alongside you. Before editing, check the current worktree state and avoid overwriting changes you did not make. Keep your changes scoped so GitButler can separate concurrent work cleanly.

## Package boundaries

`@assistant-ui/core` contains shared code. It has a `./react` sub-path that both `@assistant-ui/react` and `@assistant-ui/react-native` re-export from. Customers never install core directly — they use one of the three distribution packages (react, react-native, react-ink).

`@assistant-ui/ui` contains shadcn-style components that get copied into user projects. We use them directly in the monorepo to avoid duplication.

There is an ongoing migration from the legacy runtime architecture to a tap-only architecture. Legacy code lives in `packages/react/src/legacy-runtime` and `packages/core/src/runtimes`; new code should use the tap architecture.
