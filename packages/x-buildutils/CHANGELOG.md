# @assistant-ui/x-buildutils

## 0.0.17

### Patch Changes

- [#4598](https://github.com/assistant-ui/assistant-ui/pull/4598) [`6d947c9`](https://github.com/assistant-ui/assistant-ui/commit/6d947c96658a4156b41a13c89b07f6325a3328fa) - fix: preserve package imports as external build specifiers ([@Yonom](https://github.com/Yonom))

## 0.0.16

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#4484](https://github.com/assistant-ui/assistant-ui/pull/4484) [`10f2009`](https://github.com/assistant-ui/assistant-ui/commit/10f200961afd520eeaf1a339c12f4ca766f959d6) - Resolve bundled ambient types from hoisted monorepo installs. ([@Yonom](https://github.com/Yonom))

## 0.0.15

### Patch Changes

- [#4405](https://github.com/assistant-ui/assistant-ui/pull/4405) [`8d3b0e8`](https://github.com/assistant-ui/assistant-ui/commit/8d3b0e8aade47116d9616d8dac2328e0bb73f296) - fix: keep tap React hooks compatible with React 18 builds ([@Yonom](https://github.com/Yonom))

## 0.0.14

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.13

### Patch Changes

- [#4385](https://github.com/assistant-ui/assistant-ui/pull/4385) [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff) - feat: precompile packages with React Compiler ([@Yonom](https://github.com/Yonom))
  - aui-build runs React Compiler over packages that depend on tap and remaps `react/compiler-runtime` to the tap shim subpath, so compiled hooks and components work both in React components and inside tap resource renders
  - `@assistant-ui/tap/react-shim` exports `useMemoCache` (tap inside a resource render, `React.__COMPILER_RUNTIME.c` otherwise, with a React 18 polyfill); new `@assistant-ui/tap/react-shim/compiler-runtime` subpath mirrors `react/compiler-runtime`'s `c` export
  - tap implements `useSyncExternalStore` and a no-op `useDebugValue`; `useSubscribable` now builds on `useSyncExternalStore` so its store reads stay visible to the compiler
  - `AssistantProviderBase` opts out via `"use no memo"` because the runtime receives options through an effect inside a re-rendered child element

## 0.0.12

### Patch Changes

- [#4274](https://github.com/assistant-ui/assistant-ui/pull/4274) [`a78e4f0`](https://github.com/assistant-ui/assistant-ui/commit/a78e4f0593d6bcbd12fa8edcd19c2aa383591415) - fix: omit `onSuccess` instead of passing `undefined` so the tsdown config type-checks under `exactOptionalPropertyTypes` ([@Yonom](https://github.com/Yonom))

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.11

### Patch Changes

- [#4222](https://github.com/assistant-ui/assistant-ui/pull/4222) [`5f6946d`](https://github.com/assistant-ui/assistant-ui/commit/5f6946d9f1513aea26cb75d5b794a49244bc07a0) - fix: treat node built-ins as explicit externals during package builds ([@Yonom](https://github.com/Yonom))

## 0.0.10

### Patch Changes

- [#4175](https://github.com/assistant-ui/assistant-ui/pull/4175) [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.9

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4097](https://github.com/assistant-ui/assistant-ui/pull/4097) [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0) - build(x-buildutils): migrate `aui-build` from `ts.createProgram` to `tsdown` with `unbundle: true` ([@Yonom](https://github.com/Yonom))

  Tsdown drives both JS and `.d.ts` emission. Reference-directive restoration is preserved (tsdown/oxc drop `/// <reference>` lines, so we re-inject them in a `build:done` hook). `deps.skipNodeModulesBundle: true` keeps the old "never bundle anything from `node_modules`" behavior — devDependencies stay external instead of getting inlined into `dist`.

  Side fixes the new strict dts pipeline surfaced:
  - `@assistant-ui/tap`: dropped the `fnSymbol` brand from the public `ResourceElement` type. It referenced an `@internal` symbol that `stripInternal` removed from emit, leaving the published `.d.ts` with a dangling reference.
  - `@assistant-ui/store`: un-marked `ClientSchema` as `@internal`. It was already re-exported from the public package index; treating the re-export as authoritative.

## 0.0.8

### Patch Changes

- [#4050](https://github.com/assistant-ui/assistant-ui/pull/4050) [`693922b`](https://github.com/assistant-ui/assistant-ui/commit/693922b182b876b28d986f528b21d33da7c5bb51) - fix(x-buildutils): include local `types/` in `typeRoots` so x-buildutils itself can resolve its ambient `browser-process` types ([@Yonom](https://github.com/Yonom))

  feat(react): re-export `Unstable_DirectiveFormatter`, `Unstable_DirectiveSegment`, `Unstable_TriggerItem`, and `unstable_defaultDirectiveFormatter` from `@assistant-ui/core` so downstream packages don't need to depend on `@assistant-ui/core` directly

## 0.0.7

### Patch Changes

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.6

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.5

### Patch Changes

- c988db8: chore: update dependencies

## 0.0.4

### Patch Changes

- 376bb00: chore: update dependencies

## 0.0.3

### Patch Changes

- 349f3c7: chore: update deps
