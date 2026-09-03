# @assistant-ui/tap

## 0.9.16

### Patch Changes

- [#6528](https://github.com/assistant-ui/assistant-ui/pull/6528) [`152a35d`](https://github.com/assistant-ui/assistant-ui/commit/152a35daae0e80b5307865e59af683c4ae720794) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.9.15

### Patch Changes

- [#6305](https://github.com/assistant-ui/assistant-ui/pull/6305) [`e96d3de`](https://github.com/assistant-ui/assistant-ui/commit/e96d3dea9370159e04f82bf4eb39d6b1b1c4d21d) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.9.14

### Patch Changes

- [#6171](https://github.com/assistant-ui/assistant-ui/pull/6171) [`f2b3ef8`](https://github.com/assistant-ui/assistant-ui/commit/f2b3ef8b6330e9353741973b0bfe0abf37d81e70) - fix: flush state updates dispatched from subscriber notifications during flushTapSync ([@Kinfe123](https://github.com/Kinfe123))

## 0.9.13

### Patch Changes

- [#5884](https://github.com/assistant-ui/assistant-ui/pull/5884) [`99c5302`](https://github.com/assistant-ui/assistant-ui/commit/99c530260e625c4c63a06701ef40bda0ef6b41a6) - fix: deduplicate changelog records during StrictMode replay ([@rupic-app](https://github.com/apps/rupic-app))

- [#5833](https://github.com/assistant-ui/assistant-ui/pull/5833) [`5c092ef`](https://github.com/assistant-ui/assistant-ui/commit/5c092efb81aab1afc75acb913ecd95f0c07b7365) - feat: reconcile effects at commit time so mount, update, and Activity reveal share one mechanism ([@Yonom](https://github.com/Yonom))

- [#5885](https://github.com/assistant-ui/assistant-ui/pull/5885) [`2f3c638`](https://github.com/assistant-ui/assistant-ui/commit/2f3c638efb70313c6b64721a6edf15bb8d27bac9) - fix: rewind reducer cells through committed history so React replays from any mid-chain base reduce from the oracle state ([@okisdev](https://github.com/okisdev))

- [#5857](https://github.com/assistant-ui/assistant-ui/pull/5857) [`8e77515`](https://github.com/assistant-ui/assistant-ui/commit/8e77515ce17d91240c5e0877b6a4b4c0a2ed548a) - refactor: add a shared scheduleTask for one-off deferred work instead of allocating single-purpose UpdateScheduler instances ([@Yonom](https://github.com/Yonom))

- [#5856](https://github.com/assistant-ui/assistant-ui/pull/5856) [`d9c355d`](https://github.com/assistant-ui/assistant-ui/commit/d9c355d25c6daf415283edf769b88c4c6786fd13) - test: wait deterministically for scheduler flushes instead of racing setTimeout against MessageChannel ([@Yonom](https://github.com/Yonom))

- [#5897](https://github.com/assistant-ui/assistant-ui/pull/5897) [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7) - feat: useTapRoot falls through React for Suspense/ErrorBoundary support ([@Yonom](https://github.com/Yonom))
  feat: useSyncExternalStore now forces a rerender if the getSnapshot throws an error

- [#5850](https://github.com/assistant-ui/assistant-ui/pull/5850) [`a14b347`](https://github.com/assistant-ui/assistant-ui/commit/a14b347c67a0a2dee1f77dbf8dc6035036bcd41d) - feat: hold the committed value when a scheduler-driven update suspends in useTapRoot; createTapRoot now reports initial-render suspension with a clear error ([@Yonom](https://github.com/Yonom))

- [#5873](https://github.com/assistant-ui/assistant-ui/pull/5873) [`e999f5d`](https://github.com/assistant-ui/assistant-ui/commit/e999f5d363731fb87f4890d89a65b75ca64413db) - fix: keep the compiler memo cache across uncommitted render replays so a StrictMode double invoke observes one memoized instance ([@okisdev](https://github.com/okisdev))

- [#5881](https://github.com/assistant-ui/assistant-ui/pull/5881) [`44d98d7`](https://github.com/assistant-ui/assistant-ui/commit/44d98d708b85d6f76cd48f923e78a25d9e4b5171) - fix: roll back compiler memo caches with resource versions ([@rupic-app](https://github.com/apps/rupic-app))

- [#5858](https://github.com/assistant-ui/assistant-ui/pull/5858) [`4320fc6`](https://github.com/assistant-ui/assistant-ui/commit/4320fc62de06f89370dd074bc19530ab97ddac15) - docs: repitch the README around the hook-dispatch engine and its two use cases ([@Yonom](https://github.com/Yonom))

- [#5867](https://github.com/assistant-ui/assistant-ui/pull/5867) [`d4b8845`](https://github.com/assistant-ui/assistant-ui/commit/d4b884535d60b19f0841e94e8e5ea5cd6e14a852) - fix: preserve reducer state when React replays a chain from a record's committed dispatch floor ([@rupic-app](https://github.com/apps/rupic-app))

- [#5897](https://github.com/assistant-ui/assistant-ui/pull/5897) [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7) - feat: useReducer overloads for action-less reducers ([@Yonom](https://github.com/Yonom))

- [#5847](https://github.com/assistant-ui/assistant-ui/pull/5847) [`a279301`](https://github.com/assistant-ui/assistant-ui/commit/a27930133724dd6dafa7f6dcce6998e0bdc759e9) - fix: discard the work-in-progress render when a resource render throws ([@Yonom](https://github.com/Yonom))

- [#5886](https://github.com/assistant-ui/assistant-ui/pull/5886) [`d7322c0`](https://github.com/assistant-ui/assistant-ui/commit/d7322c0ca223dd0d34d246e55055928270df60ff) - fix: restore application snapshots when a rewound replay is discarded, stop dispatch-before-mount from stranding replay history retention, and throw in development and test environments when a below-committed replay finds no committed history to rewind ([@okisdev](https://github.com/okisdev))

- [#5876](https://github.com/assistant-ui/assistant-ui/pull/5876) [`8b0a836`](https://github.com/assistant-ui/assistant-ui/commit/8b0a836ec4a05a2b110780e7c325de7aec178af7) - test: wait deterministically for the scheduleTask flush instead of racing setTimeout against MessageChannel ([@okisdev](https://github.com/okisdev))

- [#5943](https://github.com/assistant-ui/assistant-ui/pull/5943) [`20efa42`](https://github.com/assistant-ui/assistant-ui/commit/20efa4206a7c08eb8df192305fb1e434d06a4bfc) - fix: export the full react surface the package dists import from both shims explicitly ([@okisdev](https://github.com/okisdev))

- [#5940](https://github.com/assistant-ui/assistant-ui/pull/5940) [`833fbe8`](https://github.com/assistant-ui/assistant-ui/commit/833fbe84f12a23a8caebd121d60a32528e33378d) - feat: the standalone shim gains `jsx-runtime` and `jsx-dev-runtime` entries plus module-scope `forwardRef` and `memo`, so react-coupled module graphs stay loadable under the react-less alias; rendering their JSX without real React still throws. ([@okisdev](https://github.com/okisdev))

- [#5848](https://github.com/assistant-ui/assistant-ui/pull/5848) [`94a39ad`](https://github.com/assistant-ui/assistant-ui/commit/94a39ad218bea1228c3298756122acc312cf7218) - feat: use(promise) suspends resource renders ([@Yonom](https://github.com/Yonom))

- [#5897](https://github.com/assistant-ui/assistant-ui/pull/5897) [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7) - fix: useSyncExternalStore re-checks the snapshot after commits where the value or getSnapshot changed ([@Yonom](https://github.com/Yonom))

- [#5897](https://github.com/assistant-ui/assistant-ui/pull/5897) [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7) - fix: useSyncExternalStore reads getServerSnapshot for every pre-mount render pass ([@Yonom](https://github.com/Yonom))

- [#5774](https://github.com/assistant-ui/assistant-ui/pull/5774) [`61d29f4`](https://github.com/assistant-ui/assistant-ui/commit/61d29f4157b525d3e36ac721d1fcef7d1baf987e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.9.12

### Patch Changes

- [#5827](https://github.com/assistant-ui/assistant-ui/pull/5827) [`c98699d`](https://github.com/assistant-ui/assistant-ui/commit/c98699d83b1fcc98511ca00e810e1c3d2ba019ba) - feat: mountOnSubscribe ([@Yonom](https://github.com/Yonom))

## 0.9.11

### Patch Changes

- [#5723](https://github.com/assistant-ui/assistant-ui/pull/5723) [`94dc3e5`](https://github.com/assistant-ui/assistant-ui/commit/94dc3e509fa2b4fae1a14c88ec34b910c8d95af8) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.9.10

### Patch Changes

- [#5655](https://github.com/assistant-ui/assistant-ui/pull/5655) [`71cf74e`](https://github.com/assistant-ui/assistant-ui/commit/71cf74eaa7fb3bcf1cc7af346637b51f99e3fc33) - feat: add a react-free standalone shim entry and make the react peer optional ([@okisdev](https://github.com/okisdev))

## 0.9.9

### Patch Changes

- [#5399](https://github.com/assistant-ui/assistant-ui/pull/5399) [`b8daa96`](https://github.com/assistant-ui/assistant-ui/commit/b8daa967f4e5cb181c3e9ed065ab6949ee848fa4) - re-add the deprecated useMemoCache export for older @assistant-ui/store versions ([@Yonom](https://github.com/Yonom))

## 0.9.8

### Patch Changes

- [#5368](https://github.com/assistant-ui/assistant-ui/pull/5368) [`60d049e`](https://github.com/assistant-ui/assistant-ui/commit/60d049eeadf681f4235157c903543493c98cc258) - refactor(store): local useShallowStable helper replaces tap useMemoCache; drop useMemoCache from tap's public entrypoint ([@Yonom](https://github.com/Yonom))

- [#5375](https://github.com/assistant-ui/assistant-ui/pull/5375) [`feef8fd`](https://github.com/assistant-ui/assistant-ui/commit/feef8fda65e999a90d283dca23ff656b56456803) - The update-depth error now throws from the markDirty that schedules the run past the limit, so the stack points at the offending setState. ([@Yonom](https://github.com/Yonom))

- [#5370](https://github.com/assistant-ui/assistant-ui/pull/5370) [`c02680a`](https://github.com/assistant-ui/assistant-ui/commit/c02680a16425669589db74ba1a601a8f6c4bf8e6) - fix: count update depth per scheduler in UpdateScheduler and drop only the offending scheduler from a flush, so one looping root no longer starves or wedges unrelated roots ([@Yonom](https://github.com/Yonom))

- [#5357](https://github.com/assistant-ui/assistant-ui/pull/5357) [`e6045bb`](https://github.com/assistant-ui/assistant-ui/commit/e6045bbb1cfc0d63ef75f46cf2de7fa010183451) - createTapRoot: reuse a single per-root UpdateScheduler across dispatches and assert without applying first ([@Yonom](https://github.com/Yonom))

- [#5358](https://github.com/assistant-ui/assistant-ui/pull/5358) [`04c070e`](https://github.com/assistant-ui/assistant-ui/commit/04c070e63c5dd1c51355037e42cf24c77c56da6e) - Deduplicate the rethrow-or-AggregateError error handling into a shared internal helper ([@Yonom](https://github.com/Yonom))

- [#5331](https://github.com/assistant-ui/assistant-ui/pull/5331) [`d7afb3d`](https://github.com/assistant-ui/assistant-ui/commit/d7afb3dbd2dbc76ed90f9091b599ea81bfd6e363) - fix: accept reducer replays below the committed version instead of throwing ([@okisdev](https://github.com/okisdev))

## 0.9.7

### Patch Changes

- [#5285](https://github.com/assistant-ui/assistant-ui/pull/5285) [`d72c2b6`](https://github.com/assistant-ui/assistant-ui/commit/d72c2b6b5fd0e0158b07ecf00bfe4c8ac5b3e861) - fix: useSyncExternalStore retains the last committed value when the snapshot getter throws; export `useMemoCache` from the package root ([@Yonom](https://github.com/Yonom))

## 0.9.6

### Patch Changes

- [#5208](https://github.com/assistant-ui/assistant-ui/pull/5208) [`a0ddc86`](https://github.com/assistant-ui/assistant-ui/commit/a0ddc862b0c506bd791238ebf800868e4836820a) - Adopt `erasableSyntaxOnly`; public enums are now `as const` objects. ([@Yonom](https://github.com/Yonom))

- [#5235](https://github.com/assistant-ui/assistant-ui/pull/5235) [`8c97501`](https://github.com/assistant-ui/assistant-ui/commit/8c97501892c5e76a0b10232835818c4be5da37eb) - feat: drop `configurableResource()` — use `resource()` with an options argument instead ([@Yonom](https://github.com/Yonom))

- [#5207](https://github.com/assistant-ui/assistant-ui/pull/5207) [`7e871ef`](https://github.com/assistant-ui/assistant-ui/commit/7e871efe16f1ab0dc3b0e6b21e04728835dbb6da) - Stop shipping react-shim declaration files the exports map disclaims — the shim subpaths are now genuinely untyped in every resolution mode instead of accidentally typed via TypeScript's fallback resolution. ([@Yonom](https://github.com/Yonom))

## 0.9.5

### Patch Changes

- [#5194](https://github.com/assistant-ui/assistant-ui/pull/5194) [`ecd2280`](https://github.com/assistant-ui/assistant-ui/commit/ecd22809f0c1001c1718b53b65e44630cb21414b) - feat: `configurableResource()` — curries an options-first hook into `(options) => Resource<V, A>`, replacing `.bind(null, options)` boilerplate ([@Yonom](https://github.com/Yonom))

- [#5182](https://github.com/assistant-ui/assistant-ui/pull/5182) [`83d7b42`](https://github.com/assistant-ui/assistant-ui/commit/83d7b4273596c6950f3e9548ce3c537b534d804a) - fix: implement useMemoCache on tap's dispatcher so compiled components work under duplicated tap copies ([@Yonom](https://github.com/Yonom))

- [#5181](https://github.com/assistant-ui/assistant-ui/pull/5181) [`5c54141`](https://github.com/assistant-ui/assistant-ui/commit/5c54141d4569796a7de9922285e3447ea4604374) - fix: create the scheduler MessageChannel lazily so importing tap does not hold the Node event loop open ([@Yonom](https://github.com/Yonom))

- [#5190](https://github.com/assistant-ui/assistant-ui/pull/5190) [`5412099`](https://github.com/assistant-ui/assistant-ui/commit/541209975bdc380edf7b34ecc270c201abd14788) - refactor: `ResourceElement<Result>` drops its args type parameter — elements are opaque descriptors; `Resource<Result, Args>` keeps the callable typing and `ContravariantResource` is removed ([@Yonom](https://github.com/Yonom))

- [#5186](https://github.com/assistant-ui/assistant-ui/pull/5186) [`99da4af`](https://github.com/assistant-ui/assistant-ui/commit/99da4afc5d96a6b3ca6e91fe756f0c7b0c2123a0) - feat: `withKey` accepts a Resource — `withKey(key, resourceFn)` returns a resource whose produced elements carry the key ([@Yonom](https://github.com/Yonom))

- [#5079](https://github.com/assistant-ui/assistant-ui/pull/5079) [`390e417`](https://github.com/assistant-ui/assistant-ui/commit/390e4177ca47f7ece839613ad0f076add9313328) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.9.4

### Patch Changes

- [#4746](https://github.com/assistant-ui/assistant-ui/pull/4746) [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4920](https://github.com/assistant-ui/assistant-ui/pull/4920) [`e02b21b`](https://github.com/assistant-ui/assistant-ui/commit/e02b21b23cc94f6eba692fbb285b5b27faea9ad0) - fix: preserve React-hosted tap resource roots and keyed fiber registries for the component lifetime ([@samdickson22](https://github.com/samdickson22))

- [#4919](https://github.com/assistant-ui/assistant-ui/pull/4919) [`7e28a72`](https://github.com/assistant-ui/assistant-ui/commit/7e28a726e67296b813c43859e45bfd9d1572794a) - fix: keep tap root scheduler, fiber, queue, and subscribers in React state for the full component lifetime ([@samdickson22](https://github.com/samdickson22))

- [#4815](https://github.com/assistant-ui/assistant-ui/pull/4815) [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.9.3

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.9.2

### Patch Changes

- [#4405](https://github.com/assistant-ui/assistant-ui/pull/4405) [`8d3b0e8`](https://github.com/assistant-ui/assistant-ui/commit/8d3b0e8aade47116d9616d8dac2328e0bb73f296) - fix: keep tap React hooks compatible with React 18 builds ([@Yonom](https://github.com/Yonom))

## 0.9.1

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4392](https://github.com/assistant-ui/assistant-ui/pull/4392) [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda) - fix: preserve tap context across nested tap root rerenders and mark tap context as supported ([@Yonom](https://github.com/Yonom))

## 0.8.1

### Patch Changes

- [#4385](https://github.com/assistant-ui/assistant-ui/pull/4385) [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff) - feat: precompile packages with React Compiler ([@Yonom](https://github.com/Yonom))
  - aui-build runs React Compiler over packages that depend on tap and remaps `react/compiler-runtime` to the tap shim subpath, so compiled hooks and components work both in React components and inside tap resource renders
  - `@assistant-ui/tap/react-shim` exports `useMemoCache` (tap inside a resource render, `React.__COMPILER_RUNTIME.c` otherwise, with a React 18 polyfill); new `@assistant-ui/tap/react-shim/compiler-runtime` subpath mirrors `react/compiler-runtime`'s `c` export
  - tap implements `useSyncExternalStore` and a no-op `useDebugValue`; `useSubscribable` now builds on `useSyncExternalStore` so its store reads stay visible to the compiler
  - `AssistantProviderBase` opts out via `"use no memo"` because the runtime receives options through an effect inside a re-rendered child element

- [#4389](https://github.com/assistant-ui/assistant-ui/pull/4389) [`9f13fdb`](https://github.com/assistant-ui/assistant-ui/commit/9f13fdb22d0bc1bf2ad001147b8acc0df4844302) - perf: optimize tap memo hook hot paths ([@Yonom](https://github.com/Yonom))

## 0.8.0

### Minor Changes

- feat: drop the experimental deps array from `useResource`/`useResources` and make `useResources` take an array of elements directly instead of a `getElements` callback. The React Compiler memoizes element inputs, so the manual dependency arrays were redundant; re-renders are now controlled by element identity. ([@Yonom](https://github.com/Yonom))

## 0.7.1

### Patch Changes

- [#4360](https://github.com/assistant-ui/assistant-ui/pull/4360) [`12b016b`](https://github.com/assistant-ui/assistant-ui/commit/12b016bd14560c847dadae075edb57631ac9c516) - fix: match React semantics: support render-phase updates (setState during render re-renders before committing, capped at 25 passes, instead of throwing; discarded render attempts drop their render-phase dispatches like React; updating a resource other than the one currently rendering throws), apply dispatches exactly once across React-discarded and replayed renders of tap sub-roots, run all effect cleanups before any setups within a commit, and compare only the common prefix of deps arrays that change length (with a dev warning) ([@Yonom](https://github.com/Yonom))

- [#4366](https://github.com/assistant-ui/assistant-ui/pull/4366) [`3e58253`](https://github.com/assistant-ui/assistant-ui/commit/3e5825369c7206f4df3532d5fabfbe5cf5e4fd40) - feat: add useTapHost, a React host that commits the resource in the passive phase without blocking paint; the returned per-render effects callback lets descendant consumers mount the commit ahead of their own effects via useEffect(effects). The React bridge hosts (useResource, useResources, useTapRoot) now also commit in useEffect instead of useLayoutEffect. ([@Yonom](https://github.com/Yonom))

## 0.6.2

### Patch Changes

- [#4318](https://github.com/assistant-ui/assistant-ui/pull/4318) [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b) - fix: React parity for useReducer and StrictMode. User reducers now compute during render instead of eagerly at dispatch (matching React, which reserves eager computation for useState), so dev-mode reducer invocation counts and kept results match React; a same-state dispatch now renders once like React instead of bailing out at dispatch. The React bridge keeps one host fiber across both StrictMode render passes (hosted identities match across passes like React's own hook state) and lets React's strict replay drive the effect cycle (mount, unmount, mount). ([@Yonom](https://github.com/Yonom))

- [#4318](https://github.com/assistant-ui/assistant-ui/pull/4318) [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b) - feat(tap): resources carry all hook arguments; elements are `{ hook, args }` ([@Yonom](https://github.com/Yonom))

  A `ResourceElement` is now `{ hook, args }` (was `{ type, props }`): the underlying hook plus the full tuple of arguments to call it with. This lets a resource take multiple positional arguments, exactly like a hook, and makes hosting just `hook(...args)`:

  ```ts
  const usePair = (a: number, b: string) => ({ a, b });
  const Pair = resource(usePair);
  const element = Pair(1, "hi"); // { hook: usePair, args: [1, "hi"] }
  ```

  The single-object case is unchanged ergonomically (`Counter({ initialValue: 0 })` still works; its `args` is just `[{ initialValue: 0 }]`), so existing resources and call sites are unaffected. `resource()`'s overloads collapse into one variadic signature, and the `fnSymbol` / `callResourceFn` indirection is gone (the element holds the hook directly; `renderResourceFiber` calls `fiber.hook(...args)`).

  Breaking (internal/advanced):
  - The second type parameter of `Resource` / `ResourceElement` / `ContravariantResource` now means the argument tuple `A extends readonly unknown[]` rather than a single payload `P`. Explicit two-arg annotations must wrap the payload in a tuple (e.g. `ResourceElement<R, [Props]>`).
  - A resource's identity is now its hook. Reading `element.props` becomes `element.args[0]`; reading `element.type` becomes `element.hook`. `attachTransformScopes` is now keyed by (and called with) the hook rather than the factory.
  - `useResource(element, deps)`'s second arg is unchanged in behavior (renamed `argsDeps`).

- [#4318](https://github.com/assistant-ui/assistant-ui/pull/4318) [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b) - refactor: adopt the extracted-hook convention for resources ([@Yonom](https://github.com/Yonom))

  A resource body is a hook, so resources are now authored as a `use`-prefixed hook
  wrapped with `resource()`:

  ```ts
  const useCounter = () => { ... };
  const Counter = resource(useCounter);
  ```

  `resource()` turns a hook into a Resource; `useResource(Counter(props))` turns it
  back into a hook call. Extracting the body to a `use`-prefixed hook lets React's
  stock rules-of-hooks and exhaustive-deps lint resource bodies directly. No
  public API or runtime behavior changes.

- [#4318](https://github.com/assistant-ui/assistant-ui/pull/4318) [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b) - refactor: rename the root APIs to `useTapRoot` / `createTapRoot` and make them callback-based ([@Yonom](https://github.com/Yonom))

  `useResourceRoot(element)` is now `useTapRoot(fn)` and `createResourceRoot().render(element)` is now `createTapRoot(fn)`. Both take a render callback instead of a pre-built resource element, so you no longer have to wrap a hook in `resource()` just to host it as a root. The callback must be a **named** function expression (so React's rules-of-hooks lints the body):

  ```ts
  // before
  const root = createResourceRoot();
  const handle = root.render(Counter());
  handle.getValue();

  // after
  const root = createTapRoot(function CounterRoot() {
    return useResource(Counter());
  });
  root.getValue();
  ```

  `createTapRoot` returns `{ getValue, subscribe, unmount }` directly (no separate `.render` step).

  `flushResourcesSync` is also renamed to `flushTapSync`, to match the `tap` naming of the root APIs (and to stay distinct from react-dom's `flushSync`).

## 0.6.1

### Patch Changes

- [#4313](https://github.com/assistant-ui/assistant-ui/pull/4313) [`5e1151e`](https://github.com/assistant-ui/assistant-ui/commit/5e1151e83ea3700edee9b1552f2e410b860b0afe) - fix: keep the tap React shim compatible with React 18 builds ([@Yonom](https://github.com/Yonom))

## 0.6.0

### Minor Changes

- [#4282](https://github.com/assistant-ui/assistant-ui/pull/4282) [`01cf957`](https://github.com/assistant-ui/assistant-ui/commit/01cf957c209b1a58c69f5621565397de6d1eb794) - feat: React integration ([@Yonom](https://github.com/Yonom))

  `@assistant-ui/tap` now requires `react` as a peer dependency and ships a React integration:
  - Resource API at the package root: `useResource` (host a resource element), `useResources` (keyed lists), and `useResourceRoot` (a subscribable `{ getValue, subscribe }` boundary). Each is isomorphic: it works inside a resource render and inside a React component.
  - Author resource state and effects with plain React hooks. A React dispatcher installed around every resource render makes `import { useState } from "react"` (and `useReducer`/`useRef`/`useMemo`/`useCallback`/`useEffect`/`useEffectEvent`/`use`) route to tap inside a resource, with no build step. It also backs `react/compiler-runtime`'s `useMemoCache`, so React Compiler output runs in a resource without a `"use no memo"` opt-out. Hooks tap has no equivalent for throw when called inside a resource.
  - `@assistant-ui/tap/react-shim`: a runtime drop-in for `"react"` that assistant-ui's own packages are built against (their `react` imports are pre-routed to it), so they route to tap inside a resource render and to React otherwise without depending on the consumer's bundler. It ships no type declarations; keep importing from `"react"` so React's own types apply.
  - Also exports `resource`, `withKey`, `createResourceRoot`, `flushResourcesSync`, the `createResourceContext` / `withContextProvider` context API, and the `Resource` / `ContravariantResource` / `ResourceElement` types.

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.5.14

### Patch Changes

- [#4151](https://github.com/assistant-ui/assistant-ui/pull/4151) [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3) - chore: drop stale `biome-ignore` pragmas now that the repo lints with oxlint ([@okisdev](https://github.com/okisdev))

## 0.5.13

### Patch Changes

- [#4103](https://github.com/assistant-ui/assistant-ui/pull/4103) [`cabfc71`](https://github.com/assistant-ui/assistant-ui/commit/cabfc715e99f23a55dc1276a6028792d7ecad822) - test: stabilize flaky StrictMode setTimeout rerender test on slow CI ([@Yonom](https://github.com/Yonom))

## 0.5.12

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4097](https://github.com/assistant-ui/assistant-ui/pull/4097) [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0) - build(x-buildutils): migrate `aui-build` from `ts.createProgram` to `tsdown` with `unbundle: true` ([@Yonom](https://github.com/Yonom))

  Tsdown drives both JS and `.d.ts` emission. Reference-directive restoration is preserved (tsdown/oxc drop `/// <reference>` lines, so we re-inject them in a `build:done` hook). `deps.skipNodeModulesBundle: true` keeps the old "never bundle anything from `node_modules`" behavior — devDependencies stay external instead of getting inlined into `dist`.

  Side fixes the new strict dts pipeline surfaced:
  - `@assistant-ui/tap`: dropped the `fnSymbol` brand from the public `ResourceElement` type. It referenced an `@internal` symbol that `stripInternal` removed from emit, leaving the published `.d.ts` with a dangling reference.
  - `@assistant-ui/store`: un-marked `ClientSchema` as `@internal`. It was already re-exported from the public package index; treating the re-export as authoritative.

## 0.5.11

### Patch Changes

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.5.10

### Patch Changes

- [#3909](https://github.com/assistant-ui/assistant-ui/pull/3909) [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.5.9

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3832](https://github.com/assistant-ui/assistant-ui/pull/3832) [`055dda5`](https://github.com/assistant-ui/assistant-ui/commit/055dda54b68031d0c9c760bf89a7c1036dd2174d) - fix: tapEffectEvent returned a frozen callback in production, breaking consumers that stored the reference externally (e.g. trigger popover plugin registry). Both dev and prod now use the same wrapper that reads the latest callback from the ref at call time — matching the documented "stable reference that always calls the most recent version" contract. ([@okisdev](https://github.com/okisdev))

- [#3831](https://github.com/assistant-ui/assistant-ui/pull/3831) [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063) - chore: remove decorative separator comments across packages ([@okisdev](https://github.com/okisdev))

## 0.5.8

### Patch Changes

- c988db8: chore: update dependencies

## 0.5.7

### Patch Changes

- 376bb00: chore: update dependencies

## 0.5.6

### Patch Changes

- bdce66f: chore: update dependencies
- 209ae81: chore: remove aui-source export condition from package.json exports

## 0.5.5

### Patch Changes

- 52403c3: chore: update dependencies

## 0.5.4

### Patch Changes

- 736344c: chore: update dependencies
- c71cb58: chore: update dependencies

## 0.5.3

### Patch Changes

- 349f3c7: chore: update deps

## 0.5.2

### Patch Changes

- a845911: chore: update dependencies

## 0.5.1

### Patch Changes

- 36ef3a2: chore: update dependencies

## 0.5.0

### Minor Changes

- b65428e: feat: tap scheduler now uses macro tasks
- b65428e: feat: createResourceRoot and tapResourceRoot APIs

### Patch Changes

- b65428e: feat: tapReducer API
- 6bd6419: fix(tap): prevent rollback crash when tapResourceRoot version falls below committedVersion
- b65428e: feat: Offscreen API support
- b65428e: feat: tapReducerWithDerivedState API
- b65428e: feat: tapMemo concurrent safe mode

## 0.4.6

### Patch Changes

- afaaf3b: fix: use bracket notation for process.env

## 0.4.5

### Patch Changes

- a088518: chore: update dependencies

## 0.4.4

### Patch Changes

- 77af8c3: fix: runtime not responsive if loaded under React StrictMode (critial bug)

## 0.4.3

### Patch Changes

- d45b893: chore: update dependencies
- fe71bfc: feat: tapSubscribableResource hook

## 0.4.2

### Patch Changes

- 5ab3690: fix: allow optional props in resources

## 0.4.1

### Patch Changes

- 8cbf686: fix: tap should run effects after remount
- a8be364: feat: log individual errors when throwing AggregateError
- 605d825: chore: update dependencies
- fe15232: fix: tap strict mode should double invoke tapMemo calls

## 0.4.0

### Minor Changes

- feat: add StrictMode support
- feat: add tapConst
- feat: rewrite tapResources for better performance
- feat: withKey API
- feat: flushResourcesSync API
- fix: correctly unmount effects

## 0.3.6

### Patch Changes

- 3719567: chore: update deps

## 0.3.5

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages

## 0.3.4

### Patch Changes

- fix: crash on StrictMode

## 0.3.3

### Patch Changes

- bae3aa2: feat: new scheduler
- bae3aa2: feat: global flushSync
- bae3aa2: feat: align createResource API with react-dom's createRoot
- bae3aa2: feat: new tapResources API
- bae3aa2: fix: correctly unmount resources when the element passed to useResource changes
- bae3aa2: feat: better inference of unions passed to tapResource, tapResources and useResource
- e8ea57b: chore: update deps
- bae3aa2: feat: update Resource and ResourceElement types for better type inference

## 0.3.2

### Patch Changes

- 01c31fe: chore: update dependencies

## 0.3.1

### Patch Changes

- ec662cd: chore: update dependencies

## 0.3.0

### Minor Changes

- feat: added `ContravariantResource` type
- refactor: removed `Unsubscribe` type
- refactor: moved multiple types to `tapX` hook namespace

## 0.2.2

### Patch Changes

- 2c33091: chore: update deps

## 0.2.1

### Patch Changes

- 0a4bdc1: feat: renamed `ResourceElementConstructor` to `Resource`, changed `ResourceElement.type` to be `Resource` instead of `ResourceFn`

## 0.1.5

### Patch Changes

- dbc4ec7: fix: tapRef should not support callback fns
- 2fc7e99: chore: update deps

## 0.1.4

### Patch Changes

- 953db24: chore: update deps

## 0.1.3

### Patch Changes

- chore: update deps

## 0.1.2

### Patch Changes

- e6a46e4: chore: update deps

## 0.1.1

### Patch Changes

- 0534bc5: feat: Context API

## 0.1.0

### Minor Changes

- 5437dbe: feat: runtime rearchitecture (unified state API)
