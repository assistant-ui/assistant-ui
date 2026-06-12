# @assistant-ui/tap

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
