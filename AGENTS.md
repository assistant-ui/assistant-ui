## Architecture

```
@assistant-ui/tap          → Reactive primitives that run React hooks as headless resources (resource, useResource, createTapRoot, useTapRoot)
@assistant-ui/store        → Bridges tap to React (useAui, useAuiState, AuiProvider)
@assistant-ui/core         → Framework-agnostic chat runtime (useExternalStoreRuntime, useLocalRuntime, useRemoteThreadListRuntime, ChatModelAdapter, createRuntimeExtras); ./react subpath holds the React-coupled runtime
@assistant-ui/react        → Web distribution: re-exports core (+ ./react) and adds Radix primitives
@assistant-ui/react-native → React Native distribution: re-exports core (+ ./react) and adds RN primitives
@assistant-ui/react-ink    → Ink/terminal distribution
@assistant-ui/react-*      → Framework adapters that map a provider SDK onto a core runtime (see Adapter orchestration)
@assistant-ui/ui           → Private shadcn-style component kit; the canonical source copied into user projects via the registry
@assistant-ui/x-buildutils → Shared build tooling (aui-build); see Build & release
```

## Package boundaries & public surface

`@assistant-ui/core` holds the framework-agnostic runtime; its `./react` sub-path holds the React-coupled runtime that `@assistant-ui/react` and `@assistant-ui/react-native` re-export. Customers never install core directly; they use one of the three distribution packages (react, react-native, react-ink). Platform runtimes stay in the distribution packages; framework-agnostic logic goes in core.

`@assistant-ui/ui` is a private shadcn-style kit. We use it directly in the monorepo and copy it into user projects through the registry; it is not published as a dependency.

The public surface of any published package is **append-only**. Re-point a moved export to its new file, but never remove an export that has shipped. The in-repo audit cannot see npm consumers, so even an unused-looking type is a breaking change if removed. Ship a real behavior change as its own deliberate PR.

An ongoing migration is replacing the legacy runtime (`packages/react/src/legacy-runtime/`) with the tap-only architecture in `core/src/react`. During the migration the `@assistant-ui/react` barrel re-exports both; keep it append-only.

## Adapter orchestration

A framework adapter maps a provider onto a core runtime through one `use<Name>Runtime` entry hook, accessor hooks in `hooks.ts`, and pure converters. The rule of thumb: the runtime file orchestrates, pure modules convert, the controller (if any) reduces, hooks read.

- **Core runtime.** Build on `useExternalStoreRuntime` (messages derived from an external source) or `useLocalRuntime` plus a `ChatModelAdapter` (no provider-side thread state, like `react-data-stream`), and wrap it in `useRemoteThreadListRuntime` for multi-thread support. Reuse core's runtime cores; do not create a `*ThreadRuntimeCore` state holder.
- **State exposure.** Expose runtime state to accessor hooks with `createRuntimeExtras` from `@assistant-ui/core/internal`, not a hand-rolled `Symbol` brand and guard.
- **Standard files.** `use<Name>Runtime.ts` (orchestration only), `<name>Extras.ts` (the `createRuntimeExtras` instance), `hooks.ts` (accessor and action hooks), a pure `convertMessages.ts` (both directions), and `types.ts`; add a `<Name>ThreadController.ts` plus a pure `reduce<Name>ThreadState` reducer when the adapter owns thread state, and a `./server` or `./node` subpath entry when the protocol owns the wire.
- **Server-only code.** Keep server-only or provider-SDK code in the `./server` or `./node` subpath, out of the default and React Native entries.
- **Tests.** Colocate them beside each module, covering the converter both ways, the reducer or controller, and each accessor hook.

Keep provider-driven choices flexible: core-primitive choice, thin wrapper vs accumulator vs controller, bespoke transports, HITL richness, and thread-list depth. `@assistant-ui/react-langchain` is the reference for the external-store plus converter plus `createRuntimeExtras` shape.

**Don't introduce.** A `*ThreadRuntimeCore` state holder, a `notifyUpdate` plus version-counter re-render hack (bridging non-React state with `useSyncExternalStore`), `Object.create` method grafting, or monkeypatching the caller's objects.

**Migration discipline.** During the `createRuntimeExtras` migration, add new behavior as a hook on the canonical surface, not on the deprecated path; reuse the shared core primitive (`getAutoStatus`, `useStreamingTiming`, etc.) instead of a per-adapter copy, and prefer reuse over introducing a new opt-out flag.

**Cross-runtime parity.** Keep runtime features at parity across adapters: when you add a capability (isDisabled, joinStrategy, onResume, dynamic suggestions, metadata mutation) to one runtime, expose it on every runtime that supports the concept, or write down why one diverges. A parity gap becomes a breaking expectation for users who switch adapters.

**Defensive converters.** Converters and content-block renderers must not throw on undefined or missing fields, or on unavailable platform APIs. Defend against non-spec provider payloads (missing `summary` or `text`), and keep browser-only APIs (FileReader, etc.) out of code paths that run in Node, react-ink, or React Native.

## Build & release

Every publishable package builds with `aui-build` (`@assistant-ui/x-buildutils`). Do not add a per-package build config or use tsup, unbuild, swc, or the tsc CLI. Exports maps are ESM-only and types-first (`"types"` before `"default"`), with `type: module` and `sideEffects: false`.

`packages/ui/src/components/assistant-ui` is the canonical UI source. Templates and examples alias it through tsconfig (`@/components/*`, `@/hooks/*`, `@/lib/utils`) and carry no byte-equal copies of it — except `minimal`, which ships its own (examples may still hold intentional forks). `pnpm sync-templates` keeps minimal's copies byte-equal with the source; declare intentional divergence in the `OVERRIDES` array in `scripts/sync-templates.sh`.

Run `pnpm check:resource-memo` when bumping `@babel/core`, `babel-plugin-react-compiler`, or `react-compiler`; a green build does not prove the compiler toolchain is intact. A package the published dist imports at runtime belongs in `dependencies`, not `devDependencies`, so the bundler externalizes it (a devDep gets inlined and drags unresolvable transitive imports into consumer builds). A registry item must be self-contained: enumerate every `@/components/*` import and CSS `@import` as `registryDependencies`, so `shadcn add` never lands a file with an unresolvable import.

Every PR that changes a published package needs a changeset. Always use **patch**; minor and major require maintainer approval. Private packages (`private: true` in package.json) are exempt.

```md
---
"@assistant-ui/react": patch
---

feat: description of the change
```

## API reference ownership

Everything under `apps/docs/content/docs/(reference)/api-reference/` is owned by `pnpm -C apps/docs generate:api-reference` (`apps/docs/scripts/generate-api-reference.mts`).

- Pages carrying the full-page marker `{/* AUTO-GENERATED PAGE by scripts/generate-api-reference.mts */}` are wholly generator-owned. Hand edits inside the generated block (including text between `api-reference:start/end`) are destroyed on the next run; durable prose belongs in the source JSDoc.
- Hand-written content that must survive regen goes in `api-manual` / named `api-manual:<export>` slots (or `api-example:<export>` slots).
- A fully hand-maintained page must carry `{/* api-reference:skip-auto-generation */}` immediately after the frontmatter. That marker keeps the page in the section `meta.json` sidebar list and exempts it from pruning; without it, an unexpected non-generated page is reported as an unmanaged stale page (and fails `--strict` / CI).
- Section and root `meta.json` files under that tree are generated too. Do not hand-edit them.
- CI job "API Reference Drift" regenerates in strict mode and fails if the tree drifts.

## Lint, format, and comments

Lint with `pnpm lint`, autofix with `pnpm lint:fix`. Backed by `.oxlintrc.json` (oxlint) and `.oxfmtrc.json` (oxfmt). oxfmt owns formatting; do not hand-format.

Resources use React's hooks, so dependency arrays and hook rules are checked by oxlint's native `react/exhaustive-deps` and `react/rules-of-hooks`. For these to lint a body, the hook must be named so React recognizes it: extract resources as a `use`-prefixed hook (`const useFoo = () => {…}; const Foo = resource(useFoo)`), and pass `useTapRoot`/`createTapRoot` a named function expression (`createTapRoot(function FooRoot() {…})`) rather than an arrow.

Default to zero code comments. Delete any comment that restates the code, records its history, or references the current PR or issue. Keep a comment only when it documents a *why* no future reader could recover from the code (a hidden invariant, a non-obvious constraint, an upstream workaround), and write it as a neutral declarative sentence.

## Testing

Tests are vitest, colocated beside the module under test and importing it by relative path (never by package name). Cover the converter both ways, the reducer or controller, and each accessor hook in its own `.test.tsx`. Mock with `vi.hoisted` and always spread `...await importOriginal()`; do not use `toMatchSnapshot`.

## Do's and don'ts

Do:

- **One concern per PR.** Break a large or multi-purpose change into separate PRs so each is small enough to review, can be approved on its own merits, and reverts cleanly when it regresses.
- **Write a real PR description, not a bot-generated placeholder.** Say what the change is, why it is needed, and how you did it, so a reviewer has the context to judge it without reverse-engineering the diff. The title names the change in one line; trade-offs and divergences belong in the body. A bot-generated badge is not a description.
- **Justify any divergence from how the repo already does it.** If the codebase already solves a problem one way, follow it; someone chose that approach deliberately, so a different one needs a real reason written down, not personal preference.
- **Keep unrelated changes out of the diff.** Drive-by deletions, refactors, formatting, and "while I'm here" additions bury the real change and slow review. Open a separate PR, or an issue when you only want to flag something.
- **Open an issue before a non-trivial feature PR.** A one-paragraph issue lets a maintainer confirm the direction is wanted before you sink time into code; trivial fixes (typo, small docs) need no issue.
- **Attach a minimal reproduction.** Every bug report or fix PR needs a cloneable repro (a repo, a sandbox, or a minimal snippet on the exact version). If a maintainer cannot reproduce the reported behavior, the issue or PR is closed.
- **Confirm the fix resolves the root cause.** Before opening, verify the reported error is gone with your change and reappears without it, and say why the change fixes the bug. A change that masks the symptom (swapping a value, dropping a feature, widening a type) without explaining the mechanism is rejected.
- **Keep docs and api-reference in lockstep with code in the same PR.** Regenerate api-reference and touch every doc page whose claims your change invalidates (hooks that shipped, templates that exist, tables that compare runtimes). CI should fail on docs drift, not silently drop APIs or launder the diff into the next PR.

Don't:

- **Reinvent what the framework already provides.** Build on the shared primitives instead of re-implementing runtime state, reactivity, or other plumbing; a parallel mechanism drifts from the rest of the codebase and costs everyone to maintain.
- **Add heavy or non-OSS dependencies casually.** assistant-ui is built on open source, so commercial-licensed libraries are off-limits; heavy dependencies and new build steps affect every contributor and need justification and maintainer sign-off.
- **Don't ship a new example app that duplicates one we already ship.** Scan `examples/` first; if with-cloud, with-langgraph, or with-mcp already covers the integration, your example adds no ground. New examples belong in a separate repo on your own account unless a maintainer asked for it in-repo.
- **Don't fix a bug by introducing a UX regression.** Disabling a feature, dropping an animation, or widening an API to mask a jitter or rendering bug is not an acceptable fix. Diagnose and fix the root cause; a regression is rejected even when the original report is real.
- **Don't add defensive checks the toolchain already enforces, or comment on formatting.** The repo runs `@tsconfig/strictest` with `exactOptionalPropertyTypes`, so nullability and optional-property guards are redundant; do not add "ensure x is defined" guards the compiler already catches. Formatting is automated (oxfmt), so do not raise spacing or formatting nits in review.
- **Don't `--admin` merge a PR until `gh pr checks` shows every row passing or explicitly skipped.** Filter out `pass` and `skipping` and confirm the remainder is empty, because the truncated tail once hid a failing Template Sync. If a repo-specific check (template-sync, api-surface, check:resource-memo, changeset-semver) is failing or pending, resolve it first rather than overriding.

## GitButler

If the current branch is `gitbutler/workspace`, the user uses GitButler, not Git, as version control. Do not create branches, stage files, commit, or rewrite history with Git commands unless the user explicitly asks.

Assume other coding agents are working alongside you. Before editing, check the current worktree state and avoid overwriting changes you did not make. Keep your changes scoped so GitButler can separate concurrent work cleanly.