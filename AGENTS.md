## Architecture

```
@assistant-ui/tap          → Reactive primitives inspired by React hooks (resource, useResource)
@assistant-ui/store        → Bridges tap with React (useAui, useAuiState, AuiProvider)
@assistant-ui/core         → Shared primitives and types for React + React Native
@assistant-ui/react        → Web distribution (re-exports core + adds Radix primitives)
@assistant-ui/react-native → RN distribution (re-exports core + adds RN primitives)
@assistant-ui/react-ink    → Ink/terminal distribution
```

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

Tap hook dep tracking (`tapEffect` / `tapMemo` / `tapCallback` / `tapResources`) is enforced via a small custom JS plugin at `scripts/oxlint-plugins/tap-hooks.mjs`. It wraps `eslint-plugin-react-hooks`'s `exhaustive-deps` rule and post-filters warnings whose missing dep originates from a tap stable-result hook (`tapRef`, `tapConst`, `tapEffectEvent`, or the setter half of `tapState`'s tuple), matching what Biome's `useExhaustiveDependencies` `stableResult` config used to do.

## Code comments

When you change code, delete any comment that only records its history.

## GitButler

If the current branch is `gitbutler/workspace`, the user uses GitButler, not Git, as version control. Do not create branches, stage files, commit, or rewrite history with Git commands unless the user explicitly asks.

Assume other coding agents are working alongside you. Before editing, check the current worktree state and avoid overwriting changes you did not make. Keep your changes scoped so GitButler can separate concurrent work cleanly.

## Package boundaries

`@assistant-ui/core` contains shared code. It has a `./react` sub-path that both `@assistant-ui/react` and `@assistant-ui/react-native` re-export from. Customers never install core directly — they use one of the three distribution packages (react, react-native, react-ink).

`@assistant-ui/ui` contains shadcn-style components that get copied into user projects. We use them directly in the monorepo to avoid duplication.

There is an ongoing migration from the legacy runtime architecture to a tap-only architecture.
