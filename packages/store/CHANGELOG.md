# @assistant-ui/store

## 0.2.17

### Patch Changes

- [#4385](https://github.com/assistant-ui/assistant-ui/pull/4385) [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff) - feat: precompile packages with React Compiler ([@Yonom](https://github.com/Yonom))
  - aui-build runs React Compiler over packages that depend on tap and remaps `react/compiler-runtime` to the tap shim subpath, so compiled hooks and components work both in React components and inside tap resource renders
  - `@assistant-ui/tap/react-shim` exports `useMemoCache` (tap inside a resource render, `React.__COMPILER_RUNTIME.c` otherwise, with a React 18 polyfill); new `@assistant-ui/tap/react-shim/compiler-runtime` subpath mirrors `react/compiler-runtime`'s `c` export
  - tap implements `useSyncExternalStore` and a no-op `useDebugValue`; `useSubscribable` now builds on `useSyncExternalStore` so its store reads stay visible to the compiler
  - `AssistantProviderBase` opts out via `"use no memo"` because the runtime receives options through an effect inside a re-rendered child element

## 0.2.16

### Patch Changes

- [#4366](https://github.com/assistant-ui/assistant-ui/pull/4366) [`3e58253`](https://github.com/assistant-ui/assistant-ui/commit/3e5825369c7206f4df3532d5fabfbe5cf5e4fd40) - feat: host the assistant client with useTapHost so the tap commit runs in the passive phase (no paint blocking); AuiProvider mounts the host's commit effects ahead of its children's effects ([@Yonom](https://github.com/Yonom))

- [#4325](https://github.com/assistant-ui/assistant-ui/pull/4325) [`5a4f20e`](https://github.com/assistant-ui/assistant-ui/commit/5a4f20e75dcd93aeb70a4a5582a0a5a1f870b4f2) - chore: update @assistant-ui/tap dependency ranges to ^0.7.0 ([@Yonom](https://github.com/Yonom))

## 0.2.15

### Patch Changes

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

## 0.2.14

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4282](https://github.com/assistant-ui/assistant-ui/pull/4282) [`01cf957`](https://github.com/assistant-ui/assistant-ui/commit/01cf957c209b1a58c69f5621565397de6d1eb794) - refactor: rename the client composition and event hooks to the `use*` convention to match the tap resource API: `tapClientResource` -> `useClientResource`, `tapClientLookup` -> `useClientLookup`, `tapClientList` -> `useClientList`, `tapAssistantClientRef` -> `useAssistantClientRef`, `tapAssistantEmit` -> `useAssistantEmit`. ([@Yonom](https://github.com/Yonom))

## 0.2.13

### Patch Changes

- [#4151](https://github.com/assistant-ui/assistant-ui/pull/4151) [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3) - chore: drop stale `biome-ignore` pragmas now that the repo lints with oxlint ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3)]:
  - @assistant-ui/tap@0.5.14

## 0.2.12

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4097](https://github.com/assistant-ui/assistant-ui/pull/4097) [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0) - build(x-buildutils): migrate `aui-build` from `ts.createProgram` to `tsdown` with `unbundle: true` ([@Yonom](https://github.com/Yonom))

  Tsdown drives both JS and `.d.ts` emission. Reference-directive restoration is preserved (tsdown/oxc drop `/// <reference>` lines, so we re-inject them in a `build:done` hook). `deps.skipNodeModulesBundle: true` keeps the old "never bundle anything from `node_modules`" behavior — devDependencies stay external instead of getting inlined into `dist`.

  Side fixes the new strict dts pipeline surfaced:
  - `@assistant-ui/tap`: dropped the `fnSymbol` brand from the public `ResourceElement` type. It referenced an `@internal` symbol that `stripInternal` removed from emit, leaving the published `.d.ts` with a dangling reference.
  - `@assistant-ui/store`: un-marked `ClientSchema` as `@internal`. It was already re-exported from the public package index; treating the re-export as authoritative.

- Updated dependencies [[`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0)]:
  - @assistant-ui/tap@0.5.12

## 0.2.11

### Patch Changes

- [#4069](https://github.com/assistant-ui/assistant-ui/pull/4069) [`db721df`](https://github.com/assistant-ui/assistant-ui/commit/db721df32434296ac14eab27030628107975b71c) - fix(store): key `Derived` scopes by `{source, query}` so a meta change produces a new client function in the same render pass. Previously a `Derived` whose `query` changed (e.g. `MessageByIndexProvider` whose `index` prop changed across renders) kept its underlying resource fiber, and the `get` closure was updated via `tapEffectEvent` — which lags one commit. During the in-flight render after a meta change, child consumers reading through the derived scope could resolve through the previous closure and read an index the underlying store no longer had. Hashing the meta into the `tapResources` key forces the fiber to be replaced when meta changes, so the new `clientFunction` (and the new `get`) propagates through React context immediately. Also drops the unused dynamic-meta variant (`Derived({ getMeta })`); use static `source`/`query`. ([@Yonom](https://github.com/Yonom))

- [#4023](https://github.com/assistant-ui/assistant-ui/pull/4023) [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33) - docs: add JSDoc for `useAui`, `useAuiState`, `useAuiEvent`, `AuiIf`, and `AuiProvider` ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- Updated dependencies []:
  - @assistant-ui/tap@0.5.11

## 0.2.10

### Patch Changes

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3937](https://github.com/assistant-ui/assistant-ui/pull/3937) [`5fdf17e`](https://github.com/assistant-ui/assistant-ui/commit/5fdf17e019c91b000c6f4cf9e3e56c89d764a435) - fix: `RenderChildrenWithAccessor` no longer misses re-renders when state updates after access ([@Yonom](https://github.com/Yonom))

  The accessor previously reused a single ref as both an "accessed" sentinel and the cached snapshot. A `useSyncExternalStore` post-commit consistency call could repopulate that cache with the current state, causing later real updates (e.g. `message.composer.isEditing` flipping) to be masked. Access is now tracked with a dedicated flag so children that read item state via the render prop re-render correctly when the underlying state changes.

- Updated dependencies [[`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94)]:
  - @assistant-ui/tap@0.5.11

## 0.2.9

### Patch Changes

- [#3909](https://github.com/assistant-ui/assistant-ui/pull/3909) [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e)]:
  - @assistant-ui/tap@0.5.10

## 0.2.8

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`055dda5`](https://github.com/assistant-ui/assistant-ui/commit/055dda54b68031d0c9c760bf89a7c1036dd2174d), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063)]:
  - @assistant-ui/tap@0.5.9

## 0.2.7

### Patch Changes

- c988db8: chore: update dependencies
- Updated dependencies [c988db8]
  - @assistant-ui/tap@0.5.8

## 0.2.6

### Patch Changes

- bdce66f: chore: update dependencies
- 209ae81: chore: remove aui-source export condition from package.json exports
- 2dd0c9f: feat: add forwardTransformScopes utility
- Updated dependencies [bdce66f]
- Updated dependencies [209ae81]
  - @assistant-ui/tap@0.5.6

## 0.2.5

### Patch Changes

- 52403c3: chore: update dependencies
- Updated dependencies [52403c3]
  - @assistant-ui/tap@0.5.5

## 0.2.4

### Patch Changes

- 28a987a: feat: SingleThreadList resource
  refactor: attachTransformScopes should mutate the scopes instead of cloning it
- 736344c: chore: update dependencies
- c71cb58: chore: update dependencies
- Updated dependencies [736344c]
- Updated dependencies [c71cb58]
  - @assistant-ui/tap@0.5.4

## 0.2.3

### Patch Changes

- 349f3c7: chore: update deps
- Updated dependencies [349f3c7]
  - @assistant-ui/tap@0.5.3

## 0.2.2

### Patch Changes

- a845911: chore: update dependencies
- Updated dependencies [a845911]
  - @assistant-ui/tap@0.5.2

## 0.2.1

### Patch Changes

- 36ef3a2: chore: update dependencies
- fc98475: feat(store): move `@assistant-ui/core` and `@assistant-ui/tap` to peerDependencies to fix npm deduplication
- a638f05: refactor(store): make store independent of core, add ScopeRegistry module augmentation support
- Updated dependencies [36ef3a2]
  - @assistant-ui/tap@0.5.1

## 0.2.0

### Minor Changes

- b65428e: refactor: only allow functions in scope methods

### Patch Changes

- b65428e: refactor: replace peerScopes with transformScopes API
- 6e97999: feat(core): move store tap infrastructure to @assistant-ui/core/store
- 93910bd: Rename .tsx files to .ts where no JSX syntax is used
- b65428e: refactor: rename ClientRegistry to ScopeRegistry
- Updated dependencies [b65428e]
- Updated dependencies [546c053]
- Updated dependencies [a7039e3]
- Updated dependencies [16c10fd]
- Updated dependencies [40a67b6]
- Updated dependencies [b65428e]
- Updated dependencies [b181803]
- Updated dependencies [b65428e]
- Updated dependencies [6bd6419]
- Updated dependencies [b65428e]
- Updated dependencies [4d7f712]
- Updated dependencies [ecc29ec]
- Updated dependencies [6e97999]
- Updated dependencies [b65428e]
- Updated dependencies [60bbe53]
- Updated dependencies [b65428e]
  - @assistant-ui/tap@0.5.0
  - @assistant-ui/core@0.1.0

## 0.1.6

### Patch Changes

- a088518: chore: update dependencies
- Updated dependencies [a088518]
  - @assistant-ui/tap@0.4.5

## 0.1.5

### Patch Changes

- 9ef966a: fix(store): memoize the aui client instance
- Updated dependencies [77af8c3]
  - @assistant-ui/tap@0.4.4

## 0.1.4

### Patch Changes

- d45b893: chore: update dependencies
- fe71bfc: feat: use enhanced tapSubscribableResource hook
- Updated dependencies [d45b893]
- Updated dependencies [fe71bfc]
  - @assistant-ui/tap@0.4.3

## 0.1.3

### Patch Changes

- 3bbe318: fix: allow destructuring proxy methods (e.g. `addToolResult`, `resumeToolCall`)

## 0.1.2

### Patch Changes

- 07d1c65: fix: nesting assistant providers
- 0371d72: feat: AssistantRuntimeProvider aui prop
- Updated dependencies [5ab3690]
  - @assistant-ui/tap@0.4.2

## 0.1.1

### Patch Changes

- 2e088eb: fix: restore React 18 compatibility by using use-effect-event polyfill
- a8be364: feat: log individual errors when throwing AggregateError
- 605d825: chore: update dependencies
- Updated dependencies [8cbf686]
- Updated dependencies [a8be364]
- Updated dependencies [605d825]
- Updated dependencies [fe15232]
  - @assistant-ui/tap@0.4.1

## 0.1.0

### Minor Changes

- 11625b5: feat: store v0.1

## 0.0.6

### Patch Changes

- 3719567: chore: update deps
- Updated dependencies [3719567]
  - @assistant-ui/tap@0.3.6

## 0.0.5

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages
- Updated dependencies [57bd207]
- Updated dependencies [cce009d]
  - @assistant-ui/tap@0.3.5

## 0.0.4

### Patch Changes

- Updated dependencies
  - @assistant-ui/tap@0.3.4

## 0.0.3

### Patch Changes

- bae3aa2: feat: overhaul store implementation
- e8ea57b: chore: update deps
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [bae3aa2]
- Updated dependencies [e8ea57b]
- Updated dependencies [bae3aa2]
  - @assistant-ui/tap@0.3.3

## 0.0.2

### Patch Changes

- 01c31fe: chore: update dependencies
- Updated dependencies [01c31fe]
  - @assistant-ui/tap@0.3.2

## 0.0.1

### Patch Changes

- ec662cd: chore: update dependencies
- Updated dependencies [ec662cd]
  - @assistant-ui/tap@0.3.1
