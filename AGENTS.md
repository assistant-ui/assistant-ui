# assistant-ui

Composable runtime and UI primitives for AI chat in React, React Native, and the terminal; the README carries the rest.

## Commands

- Build a package's workspace dependencies before testing or typechecking it (`pnpm turbo build --filter='<pkg>^...'`), because vitest and tsc resolve them through `dist`.
- Run pnpm commands one at a time, because `verifyDepsBeforeRun: install` makes concurrent runs race and half-install `node_modules`; repair with `rm -rf node_modules && CI=true pnpm install --frozen-lockfile`.
- `pnpm lint:fix` formats; oxfmt owns formatting, so never format by hand.
- `pnpm sync-templates --write` after editing a `packages/ui` component or an `apps/registry` file that `templates/minimal` mirrors; the Template Sync job fails on drift.
- `pnpm check:resource-memo` after bumping `@babel/core`, `babel-plugin-react-compiler`, or `react-compiler`, because a green build does not prove the compiler toolchain works.
- autofix.ci commits the output of `pnpm lint:fix`, `pnpm api-surface`, `pnpm size:update:all`, and `pnpm -C apps/docs generate:api-reference` to every PR.

## Rules

### Changes

- Compose features from the existing runtime and component model; never add a parallel abstraction or reimplement runtime state, reactivity, or plumbing.
- Preserve accessibility, keyboard support, and responsive layout in every UI change.
- Make the smallest change that fixes the underlying mechanism, and do not preserve complexity only because it exists.
- Follow the repository's existing solution to a problem; a different approach needs a written reason.
- Fix a bug at its root cause, never with a UX regression (disabling a feature, dropping an animation, widening an API), and confirm the reproduction fails without the fix and passes with it.
- Keep unrelated changes out of the diff (a separate PR, or an issue to flag them), and update every doc page the change invalidates in the same PR.
- Never add a commercially licensed dependency; heavy dependencies and new build steps need maintainer sign-off.
- Never add a guard the compiler already enforces (`@tsconfig/strictest` with `exactOptionalPropertyTypes`), and never raise formatting in review.
- Default to zero comments: delete one that restates the code or references the PR or issue, and keep one only for a why the code cannot carry (a hidden invariant, a non-obvious constraint, an upstream workaround), written as a neutral declarative sentence.
- When you change code, delete any comment that only records its history.

### Packages

- Never remove or rename a shipped export of a published package, because npm consumers the repository cannot see break; re-point a moved export to its new file, and ship a behavior change as its own PR.
- Put framework-agnostic runtime code in `@assistant-ui/core` (React-coupled code in its `./react` subpath) and platform runtimes in the `react`, `react-native`, and `react-ink` distributions; new runtime code goes in `packages/core/src/react`, not the `packages/react/src/legacy-runtime/` it is replacing.
- Use caret ranges for dependency specifiers, except in `examples/with-expo/package.json`, which `expo install --fix` manages, and the exact-pinned Learn course projects under `apps/docs/lib/xulux/learn/courses/`.

### Upstream majors

- Put an upstream a package imports at runtime in `dependencies` on one caret major, never a `||` union; when a workspace package it installs peers the same upstream, make it a required peer on that major instead.
- Make a host-owned SDK or per-app singleton (lexical) a peer on a wide floor below any dev pin, and optional when the package works without it.
- Raise a peer floor only when the code needs a newer API.
- Land an upstream major in one PR that moves the package and every workspace consumer (for the AI SDK also the docs vN page, vN-legacy stub, example rename, and redirect), released as a major of the package; users on the old major pin its last release, with no backports.
- Exercise every major a `||` peer union names in CI types and tests, and drop an untested one only in a new release line, because collapsing an advertised major breaks consumers.
- Change an in-repo protocol only by an additive decoder branch, and never rename a persistence or wire identifier (`"ai-sdk/v6"`, protocol headers) in a version bump.
- Never publish a parallel `-vN` package; a transition copy stays a private package and is deleted when the migration completes.
- Pin an upstream family released the same day to patches older than `minimumReleaseAge`, because a newer floor fails a fresh resolve that an existing lockfile hides.

### Tests

- Colocate vitest tests beside the module and import it by relative path, never by package name.
- Mock with `vi.hoisted` and spread `...await importOriginal()`; never use `toMatchSnapshot` or add `vi.clearAllMocks()` to hooks, because `clearMocks` already clears call history.
- `pnpm typecheck` covers test files too, and CI runs it on every changed package, so a type error in a test fails the PR.
- Check a workspace that ships `.vue` or `.svelte` components with `vue-tsc` or `svelte-check` (`typescript` aliased to `npm:@typescript/typescript6`), never plain `tsc`, which skips component bodies.
- Mark a repro test "repro" and delete it when the work is done, folding anything worth keeping into the suite; contract tests at public seams stay.

### Shipping

- Edit a UI component at its source under `packages/ui/src/components/`, never a template's synced copy; intentional divergence goes in `OVERRIDES` in `scripts/sync-templates.sh`.
- List every `@/` CSS `@import` of a registry item in its `registryDependencies`, as `apps/registry/scripts/build-registry.ts` already requires for its `@/` code imports, or `shadcn add` lands an unresolvable import.
- Give every PR that changes a published npm package a `patch` changeset (one changeset may name several packages); a maintainer-approved minor or major carries `<!-- caret-break: intended -->`.
- The Semver Check job fails a PR whose shipped files change without a changeset, and `pnpm changesets:check` rejects one naming a private package.
- Never `--admin` merge until `gh pr checks`, minus its `pass` and `skipping` rows, is empty; resolve a failing or pending repository check instead of overriding it.
- On `gitbutler/workspace`, use GitButler: never create branches, stage, commit, or rewrite history with Git unless asked.
- Assume other agents edit alongside you: check the worktree state first, never overwrite changes you did not make, and keep yours scoped.

## Where things live

- `packages/AGENTS.md` carries the build, dependency, and adapter rules for package code.
- A nested AGENTS.md carries its directory's rules; read it before changing files there.
- `CONTRIBUTING.md` owns changeset types and pull request scope, titles, and descriptions; read it before writing a changeset or opening a PR.
- `packages/x-performance/README.md` owns performance measurement; read it before adding a counter contract, bench, or fixture.
- `node_modules/next/dist/docs/`, resolved from the app's directory, holds the pinned Next.js docs; read the relevant guide before writing Next.js code, and heed its deprecation notices.

## Editing this file

- One rule per bullet, imperative, with at most one because-clause naming the failure it prevents.
- A lesson from one session goes to commit messages, issues, or the maintainer's memory store; a rule enters here only when the same mistake repeats or a review catches it.
- A rule an existing check asserts is a one-line pointer to that check, not a restatement.
- Keep this file under 8 KB and any nested AGENTS.md under 5 KB; no inventories, dates, issue numbers, or module internals.
