# @assistant-ui/store

## 0.3.12

### Patch Changes

- [#6547](https://github.com/assistant-ui/assistant-ui/pull/6547) [`6bd1570`](https://github.com/assistant-ui/assistant-ui/commit/6bd157073f12006e5f8cdcb41d10735f6d93d6a7) - fix: drop zustand from core ([@okisdev](https://github.com/okisdev))
  
  core declared zustand as an optional peer while importing `create` and `useShallow` unconditionally. pnpm keys a package instance on its resolved peers, so two dependency branches landing on different zustand patches (5.0.14 under one, 5.0.15 under the other) produced two physical copies of core. React context is per copy, so a `RuntimeAdapterProvider` rendered by one copy was invisible to a runtime hook imported from the other: `unstable_Provider` supplied a `history` adapter, `useAISDKRuntime` read `undefined`, `withFormat()` never fired, and every thread loaded with no messages and no error.
  
  core no longer uses zustand at all, so the peer is gone rather than reclassified. the four internal stores now use `WritableSubscribable`, a mutable cell built on the existing `BaseSubscribable` and read through `useSubscribable`. the two `useShallow` call sites wrapped selectors passed to `useAuiState`, aui's own store, so they now use `useShallowSelector` from `@assistant-ui/store/internal`, which memoizes a selector against the `shallowEqual` that already lived there.
  
  `WritableSubscribable` reports a server snapshot and `useSubscribable` forwards one when the subscribable offers it, so the components reading these stores render under SSR the way the zustand hook did. Subscribables without one, including every existing runtime client, keep their current behaviour.
  
  `@assistant-ui/react-native` and `@assistant-ui/react-ink` declared zustand only to satisfy core's optional peer and never imported it, so they no longer declare it. `@assistant-ui/react` and `@assistant-ui/ui` keep theirs because they import it directly, and `@assistant-ui/react` additionally exposes `StoreApi` through `ReadonlyStore` in its published types.

- [#6586](https://github.com/assistant-ui/assistant-ui/pull/6586) [`9f08bdc`](https://github.com/assistant-ui/assistant-ui/commit/9f08bdc9c1208951cc71e60bd762b12bdb588e4b) - chore: deduplicate the internal development flag ([@okisdev](https://github.com/okisdev))

- [#6528](https://github.com/assistant-ui/assistant-ui/pull/6528) [`152a35d`](https://github.com/assistant-ui/assistant-ui/commit/152a35daae0e80b5307865e59af683c4ae720794) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#6688](https://github.com/assistant-ui/assistant-ui/pull/6688) [`8135d16`](https://github.com/assistant-ui/assistant-ui/commit/8135d16dfb871e807d94a427e958d2b957b19f1e) - fix: peer ranges on the packages this workspace releases now track the release train ([@okisdev](https://github.com/okisdev))
  
  changesets rewrites a peer range only when the new version falls outside it, so the hand-written floors had drifted below the code they describe. core declared `@assistant-ui/store: ^0.3.0` while importing `@assistant-ui/store/internal`, a subpath store did not export until 0.3.10, and react-lexical declared `*`. these peers are now `workspace:^`, which publishes as the version released alongside them.

- [#6495](https://github.com/assistant-ui/assistant-ui/pull/6495) [`fa9c0dc`](https://github.com/assistant-ui/assistant-ui/commit/fa9c0dc8e88724f3d01251e002c3f4bb4c252f4a) - feat: allow string ids in the stale scope reporter ([@okisdev](https://github.com/okisdev))

- [#6498](https://github.com/assistant-ui/assistant-ui/pull/6498) [`65d449b`](https://github.com/assistant-ui/assistant-ui/commit/65d449bf225e190f308de00f85196420b72dc6d4) - feat: export useAssistantContextValue from the client entry ([@okisdev](https://github.com/okisdev))
  
  The framework-neutral client subpath now carries the ambient-client read, so store entries can stay off the React-coupled barrel.

- [#6348](https://github.com/assistant-ui/assistant-ui/pull/6348) [`49e727b`](https://github.com/assistant-ui/assistant-ui/commit/49e727b440c3c395ec7c4e9530a5b460b03b8f33) - chore: expose shallowEqual from the internal entry ([@rupic-app](https://github.com/apps/rupic-app))

- [#6563](https://github.com/assistant-ui/assistant-ui/pull/6563) [`8206d8f`](https://github.com/assistant-ui/assistant-ui/commit/8206d8f139804dcb030a0731571858db16f42bd7) - feat: accept a content inset in the shared viewport scroll helpers ([@okisdev](https://github.com/okisdev))

## 0.3.11

### Patch Changes

- [#6305](https://github.com/assistant-ui/assistant-ui/pull/6305) [`e96d3de`](https://github.com/assistant-ui/assistant-ui/commit/e96d3dea9370159e04f82bf4eb39d6b1b1c4d21d) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.3.10

### Patch Changes

- [#6068](https://github.com/assistant-ui/assistant-ui/pull/6068) [`ac0c836`](https://github.com/assistant-ui/assistant-ui/commit/ac0c8364a0f25555f693e4354d07c411e65f5489) - fix: stabilize `unstable_useAdapters` results on both adapter faces and warn on an unkeyed history factory. the React host's synthesized provider now absorbs a fresh but shallow-equal adapters bag the same way the `RemoteThreadList` store entry does, reusing the store's `useShallowStable` primitive through its internal entry, and the store entry warns in development when a history adapter arrives while the thread factory is unkeyed, since switching threads would silently keep the first thread's history. ([@okisdev](https://github.com/okisdev))

- [#5831](https://github.com/assistant-ui/assistant-ui/pull/5831) [`2b0fec7`](https://github.com/assistant-ui/assistant-ui/commit/2b0fec76d8abff2b013aa05eb2a5d62545325da2) - feat: `aui.optional.<scope>` resolves an unavailable scope to `undefined` instead of a throwing accessor, mirroring `s.optional` on the state side; the documented availability check moves off `source != null` ([@okisdev](https://github.com/okisdev))

- [#5998](https://github.com/assistant-ui/assistant-ui/pull/5998) [`f44163f`](https://github.com/assistant-ui/assistant-ui/commit/f44163f8030e8a12d33f1412de96ecdda4000f7c) - fix: stop active chats only when their standalone client is destroyed ([@Kinfe123](https://github.com/Kinfe123))

- [#5834](https://github.com/assistant-ui/assistant-ui/pull/5834) [`d80e988`](https://github.com/assistant-ui/assistant-ui/commit/d80e9882c4ec0a7662df28546ddd92cc1f0b1fcd) - fix: model-context registrations follow the committed scope across structural replacements. The new `useAssistantScopeEffect(scope, effect, deps)` re-runs a registration when the scope's bound client is replaced (cleaning up against the old one first) while ignoring value updates, and the toolkit, runtime-adapter, interactables, and MCP registration sites now use it instead of registering once against a stable client ref. ([@okisdev](https://github.com/okisdev))

- [#5897](https://github.com/assistant-ui/assistant-ui/pull/5897) [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7) - fix: cache live config source reads between notifications so getConfig satisfies the useSyncExternalStore getSnapshot contract ([@Yonom](https://github.com/Yonom))

- [#5913](https://github.com/assistant-ui/assistant-ui/pull/5913) [`1b9c33d`](https://github.com/assistant-ui/assistant-ui/commit/1b9c33d114ab1589f0592fabda58ca63265265c6) - feat: hoist the shared binding utilities to the client entry. createClientFacade (stable client facade over a source) and createLastValidCache/createStaleReporter (by-index shrink guard with an injectable expiry scheduler) were duplicated per framework bridge; they now live on @assistant-ui/store/client so bridges cannot drift. ([@okisdev](https://github.com/okisdev))

- [#5618](https://github.com/assistant-ui/assistant-ui/pull/5618) [`82e2bde`](https://github.com/assistant-ui/assistant-ui/commit/82e2bde62d0b3b31ec445c939c719ab72cd8ff23) - refactor: the config path rides React's scheduler instead of a self-scheduled tap root ([@Yonom](https://github.com/Yonom))

- [#5889](https://github.com/assistant-ui/assistant-ui/pull/5889) [`52df42d`](https://github.com/assistant-ui/assistant-ui/commit/52df42da5d7c4e9610469f64b8e3fe8fd690d7cd) - feat: subscription-owned lifecycle for createAssistantClient. the handle now rides tap's mountOnSubscribe: scopes render lazily on first read, mount when the first subscriber attaches, and soft unmount one task after the last subscriber releases (effects clean up, state is retained, a later subscriber remounts the same scopes). state updates before the first subscriber throw; an imperative consumer without a reactive framework holds a no-op subscription. destroy() remains the permanent teardown: synchronous while subscribers are attached; after the last release it defers to the soft unmount that release already scheduled. requires @assistant-ui/tap ^0.9.12. ([@okisdev](https://github.com/okisdev))

- [#5928](https://github.com/assistant-ui/assistant-ui/pull/5928) [`6c9e7dd`](https://github.com/assistant-ui/assistant-ui/commit/6c9e7ddf584394ce63c3bc5f17bafcb28face442) - feat: hoist the viewport scroll math to the client entry. isViewportAtBottom, viewportOverflows, isUserScrollUp, and observeContentResize were vue-local; they now live on @assistant-ui/store/client so the svelte viewport consumes the same implementation. ([@okisdev](https://github.com/okisdev))

- [#6014](https://github.com/assistant-ui/assistant-ui/pull/6014) [`7748e15`](https://github.com/assistant-ui/assistant-ui/commit/7748e15acf9d7d16701296e9ef89e1757ec346b3) - feat: host remote thread runtimeHooks as keyed tap resources on the list hook. `useRemoteThreadListRuntime` mounts one `useResources` host after each thread's `unstable_Provider`, so the first `runtimeHook` call already sees Provider adapters. AdapterSink only publishes those adapters. `@assistant-ui/store/client` exports `useConfiguredAui` and `useAssistantContextProvider` so that host can extend and provide a client the same way `AuiProvider` does in React. ([@okisdev](https://github.com/okisdev))

- [#5914](https://github.com/assistant-ui/assistant-ui/pull/5914) [`0d2e23f`](https://github.com/assistant-ui/assistant-ui/commit/0d2e23f5597c2500da03ac417bfee1defd2d808e) - feat: new `threads.selectionChanged` event carrying `threadId` and `previousThreadId`; deprecate `threadListItem.switchedTo`/`switchedAway` in its favor. Un-deprecate the semantically meaningful events (`thread.runStart`, `thread.runEnd`, `thread.initialize`, `composer.send`, `composer.attachmentAdd`). ([@Yonom](https://github.com/Yonom))
  
  The new event fires in situations where the deprecated pair did not, so the selection-driven defaults (`scrollToBottomOnThreadSwitch`, `unstable_focusOnThreadSwitched`) now engage there too: `InMemoryThreadList` emits on selection changes (it previously emitted no switch events at all), `switchToNewThread()` emits for the newly created thread, and runtimes that resolve a deep-linked `threadId`/`initialThreadId` after mount (`useRemoteThreadListRuntime`) emit when the deep link resolves, with the initial placeholder thread as `previousThreadId`.

## 0.3.9

### Patch Changes

- [#5829](https://github.com/assistant-ui/assistant-ui/pull/5829) [`4b75b8f`](https://github.com/assistant-ui/assistant-ui/commit/4b75b8f96729314a369879d26d8e4cd8321eac36) - fix: scoped event listeners under a derived-only provider filter against the child's own bindings instead of the parent's, in both directions and through scope-less intermediate hosts ([@okisdev](https://github.com/okisdev))

- [#5795](https://github.com/assistant-ui/assistant-ui/pull/5795) [`00a630a`](https://github.com/assistant-ui/assistant-ui/commit/00a630aa93ce0a5e40f81fbf6ff1886275f72356) - fix: publish hosted scope rebinds before descendant layout effects ([@Gujiassh](https://github.com/Gujiassh))

- [#5769](https://github.com/assistant-ui/assistant-ui/pull/5769) [`f59d24b`](https://github.com/assistant-ui/assistant-ui/commit/f59d24b3ee7036c94bce7bc0a38f018574f50a69) - fix: deliver `threadListItem.switchedTo` to default-scope listeners ([#5699](https://github.com/assistant-ui/assistant-ui/issues/5699)). the thread list item client now emits the switch from its own observed selection transition, after the flush that rebinds the derived scopes, instead of relaying the runtime's synchronous notification. scoped listeners now resolve their scope against the host's current client at delivery time, so a listener subscribed before a structural swap follows the scope's present binding; the notification manager re-reads the listener set at flush time per the documented live-set semantics. listeners that need a pinned instance subscribe on an id-scoped client instead. ([@okisdev](https://github.com/okisdev))

## 0.3.8

### Patch Changes

- [#5723](https://github.com/assistant-ui/assistant-ui/pull/5723) [`94dc3e5`](https://github.com/assistant-ui/assistant-ui/commit/94dc3e509fa2b4fae1a14c88ec34b910c8d95af8) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.3.7

### Patch Changes

- [#5677](https://github.com/assistant-ui/assistant-ui/pull/5677) [`4e99deb`](https://github.com/assistant-ui/assistant-ui/commit/4e99deb80dc3401480f80c7bef31acbf86a71573) - feat: createAssistantClient accepts an AssistantConfigSource, re-read in the root render so bindings can deliver config changes (updated element args, added or removed scopes) without remounting surviving scopes ([@okisdev](https://github.com/okisdev))

- [#5707](https://github.com/assistant-ui/assistant-ui/pull/5707) [`2af514c`](https://github.com/assistant-ui/assistant-ui/commit/2af514cabbf6d7d52cb0fd20ef8d1e842294ebb3) - fix: answer Vue reactivity introspection probes (`__v_raw`, `__v_isRef`, `__v_isReactive`, `__v_isReadonly`, `__v_isShallow`, `__v_skip`) on client proxies with undefined instead of an error accessor, so Vue's toRaw/isRef checks and its dev warning formatter no longer throw when a client crosses a Vue boundary ([@okisdev](https://github.com/okisdev))

## 0.3.6

### Patch Changes

- Republish of 0.3.5 (registry staged-version conflict blocked the original publish; contents identical).

## 0.3.5

### Patch Changes

- [#5668](https://github.com/assistant-ui/assistant-ui/pull/5668) [`bd4c0ad`](https://github.com/assistant-ui/assistant-ui/commit/bd4c0ad3d41a65d0a2caea921f82c6502011615a) - feat: expose the scope-author surface (attachTransformScopes, useAssistantClientRef, useClientLookup, and the client schema types) from the client entry, and seed the client ref during the standalone root render ([@okisdev](https://github.com/okisdev))

## 0.3.4

### Patch Changes

- [#5430](https://github.com/assistant-ui/assistant-ui/pull/5430) [`dcacd9b`](https://github.com/assistant-ui/assistant-ui/commit/dcacd9bc45117f9beca698006fd67616d2c1ca61) - feat: AuiProvider extends/config grammar. `config={AuiConfig({...})}` alone creates a top-level root client; nested providers must pass `extends` — a client to extend, or `null` to isolate (dev-enforced). An empty config creates a client extending the `extends` client; `ref` exposes the resulting client. The `config` prop only accepts configs built with `AuiConfig(...)` (branded type). AssistantRuntimeProvider gains an optional `config` prop whose scopes are provided alongside the runtime scope. The `useAui({...})` extension overload and the AuiProvider `value` prop are deprecated; `value={client}` now exposes a client extending the given one (same scopes, new identity) rather than the exact instance. `useAui({})` with an empty scope object now mounts a rooted host (so the scope set can grow across renders) instead of a passthrough derived-only client. `useAuiState` state enumeration (`Object.keys`/spread) now includes scopes inherited from parent clients, matching `in`-operator behavior. Clients derived from a hand-built parent (a plain object with `subscribe`/`on`) forward scoped `on(...)` listeners to the parent's `on` instead of throwing for scopes the parent does not expose. ([@Yonom](https://github.com/Yonom))

- [#5660](https://github.com/assistant-ui/assistant-ui/pull/5660) [`aa302ee`](https://github.com/assistant-ui/assistant-ui/commit/aa302eeaacd399f58b74b64eb3a1e17d9ea97e03) - feat: add a framework-neutral client entry with createAssistantClient over a standalone tap root ([@okisdev](https://github.com/okisdev))

- [#5660](https://github.com/assistant-ui/assistant-ui/pull/5660) [`aa302ee`](https://github.com/assistant-ui/assistant-ui/commit/aa302eeaacd399f58b74b64eb3a1e17d9ea97e03) - feat: make the react peer optional; react-less consumers alias react to @assistant-ui/tap/standalone-shim instead ([@okisdev](https://github.com/okisdev))

## 0.3.3

### Patch Changes

- [#5411](https://github.com/assistant-ui/assistant-ui/pull/5411) [`90b3003`](https://github.com/assistant-ui/assistant-ui/commit/90b3003b943e083fa6cd81e30181bf5b88904361) - fix: prevent Composer updates from being lost under React StrictMode ([@nyl199310](https://github.com/nyl199310))

## 0.3.2

### Patch Changes

- [#5364](https://github.com/assistant-ui/assistant-ui/pull/5364) [`d2e7a4a`](https://github.com/assistant-ui/assistant-ui/commit/d2e7a4a1c71c214fd8c4363ec16e879d1122639e) - AuiIf: trim JSDoc and add a mount/unmount contract test ([@Yonom](https://github.com/Yonom))

- [#5367](https://github.com/assistant-ui/assistant-ui/pull/5367) [`ecd7c87`](https://github.com/assistant-ui/assistant-ui/commit/ecd7c879cace69d6371b3f673c52a80669377fc0) - feat: AuiProvider accepts value={null} as an isolation boundary; useAui runs a fixed hook count per overload and deprecates the explicit-parent config ([@Yonom](https://github.com/Yonom))

- [#5385](https://github.com/assistant-ui/assistant-ui/pull/5385) [`2daf2d5`](https://github.com/assistant-ui/assistant-ui/commit/2daf2d5dfcb77938f6deb63d048575540e1806a2) - perf: simplify useAui notification and effect plumbing ([@Yonom](https://github.com/Yonom))

- [#5354](https://github.com/assistant-ui/assistant-ui/pull/5354) [`a5bdbed`](https://github.com/assistant-ui/assistant-ui/commit/a5bdbed993d8f14c919b692b40d51f5cd64467b9) - useClientList: clear initial-data handles on commit instead of during render so discarded renders can replay ([@Yonom](https://github.com/Yonom))

- [#5361](https://github.com/assistant-ui/assistant-ui/pull/5361) [`fb993c3`](https://github.com/assistant-ui/assistant-ui/commit/fb993c34ca1623bac373137c5ab207dd79cb500c) - useClientLookup: derive the key-to-index map from the validated element keys and drop the redundant keys memo ([@Yonom](https://github.com/Yonom))

- [#5355](https://github.com/assistant-ui/assistant-ui/pull/5355) [`1c5266c`](https://github.com/assistant-ui/assistant-ui/commit/1c5266c1fb32bc71647fedc485372f6ffa25171f) - useAuiState: derive the assistant state proxy from the client via a WeakMap so hand-built clients no longer yield an undefined selector argument ([@Yonom](https://github.com/Yonom))

- [#5353](https://github.com/assistant-ui/assistant-ui/pull/5353) [`cdcdbd0`](https://github.com/assistant-ui/assistant-ui/commit/cdcdbd0a9354483a72edbc01f51a850a1d6b5dc5) - fix: report proxy properties as configurable so `Object.keys`, spread, and `Object.getOwnPropertyDescriptor` on clients and the proxied assistant state no longer throw the proxy invariant TypeError ([@Yonom](https://github.com/Yonom))

- [#5360](https://github.com/assistant-ui/assistant-ui/pull/5360) [`42dbc69`](https://github.com/assistant-ui/assistant-ui/commit/42dbc697642c0fa327728860f78a8ce5270bf32d) - useAui: memoize scope meta via shallow equality on the query object instead of a spread deps array, so query key-count changes are detected reliably ([@Yonom](https://github.com/Yonom))

- [#5356](https://github.com/assistant-ui/assistant-ui/pull/5356) [`25f1e4f`](https://github.com/assistant-ui/assistant-ui/commit/25f1e4f9d33073216458d3c5a05e8d79845d4b3b) - Share a single InferClientState type across useClientResource, useClientLookup, and useClientList ([@Yonom](https://github.com/Yonom))

- [#5380](https://github.com/assistant-ui/assistant-ui/pull/5380) [`d16e62d`](https://github.com/assistant-ui/assistant-ui/commit/d16e62d25b5c1e7e2bc1504fb4a5e97c3c25b6e3) - refactor: inline single-call-site useAui helper hooks ([@Yonom](https://github.com/Yonom))

- [#5368](https://github.com/assistant-ui/assistant-ui/pull/5368) [`60d049e`](https://github.com/assistant-ui/assistant-ui/commit/60d049eeadf681f4235157c903543493c98cc258) - refactor(store): local useShallowStable helper replaces tap useMemoCache; drop useMemoCache from tap's public entrypoint ([@Yonom](https://github.com/Yonom))

- [#5312](https://github.com/assistant-ui/assistant-ui/pull/5312) [`2eca438`](https://github.com/assistant-ui/assistant-ui/commit/2eca4386778618f555258855ee6612eb44d89bb2) - refactor: import `useEffectEvent` from React directly for latest-client reads and drop the `use-effect-event` ponyfill dependency ([@Yonom](https://github.com/Yonom))

- [#5362](https://github.com/assistant-ui/assistant-ui/pull/5362) [`23ee5db`](https://github.com/assistant-ui/assistant-ui/commit/23ee5dbb60e6ac7993b8ce4023fb63a5f7eea713) - ValidateClient: restructure into independent per-facet checks; createErrorClientAccessor now requires the scope name ([@Yonom](https://github.com/Yonom))

## 0.3.1

### Patch Changes

- [#5297](https://github.com/assistant-ui/assistant-ui/pull/5297) [`3a762ed`](https://github.com/assistant-ui/assistant-ui/commit/3a762edd7e4645ea4aa50691bab680af73e5cff6) - feat: optional state view — `s.optional.<scope>` resolves to `undefined` when the scope is unavailable instead of throwing, so `useAuiState((s) => s.optional.threadListItem?.remoteId)` works outside a thread list item. The base state stays non-optional and keeps throwing on unavailable scopes. ([@Yonom](https://github.com/Yonom))

## 0.3.0

### Minor Changes

- [#5275](https://github.com/assistant-ui/assistant-ui/pull/5275) [`9a7e776`](https://github.com/assistant-ui/assistant-ui/commit/9a7e77603d59b5e091ee922e2e087f0101679321) - feat: property API for aui — nullary scope accessors are now properties (`aui.thread.getState()` instead of `aui.thread().getState()`); calling them still works but is deprecated. Accessors keep `source`/`query`/`name` selection metadata as properties; these are reserved names for scope methods. An unavailable scope's accessor no longer throws at selection time: `aui.thread` always succeeds and is always truthy, `.source` is null, and any other property read (or a call) throws — check availability via `aui.thread.source != null`. Accessor identity is binding-keyed: stable across renders without structural change, new on structural change — memoization keyed on an accessor now invalidates exactly when its binding changes. ([@Yonom](https://github.com/Yonom))

### Patch Changes

- [#5282](https://github.com/assistant-ui/assistant-ui/pull/5282) [`ae5f831`](https://github.com/assistant-ui/assistant-ui/commit/ae5f83129b20edb38b7f9e7f92b6c60f3c8fe8d9) - feat: `getClientId(client)` returns an opaque, WeakMap-legal identity for a bound client — the same object regardless of accessor wrapping depth. The cloud message persistence cache is now keyed on it instead of the per-mount accessor proxy. Removes `unwrapClientAccessor` and `getBoundClient` (introduced and replaced pre-release, never published). ([@Yonom](https://github.com/Yonom))

- [#5270](https://github.com/assistant-ui/assistant-ui/pull/5270) [`dcc41bb`](https://github.com/assistant-ui/assistant-ui/commit/dcc41bb50948f64744a052b22720f0f8dffa510e) - feat: render-bound immutable aui instances — derived scopes resolve to client instances during render and are frozen into the returned client; structural swaps produce a new client through React while value updates never change client identity. Removes the PartByIndexProvider lastPartRef guards and the useClientLookup stale-index clamp. ([@Yonom](https://github.com/Yonom))

## 0.2.22

### Patch Changes

- [#5250](https://github.com/assistant-ui/assistant-ui/pull/5250) [`d4bdf2c`](https://github.com/assistant-ui/assistant-ui/commit/d4bdf2c50f741912c1c165bd65441ff91bc632dc) - Warn instead of throw on recoverable inconsistencies: duplicate same-priority tool registrations merge with the latest registration taking precedence, duplicate message ids skip linking, stale client lookup indices are clamped, and null tool names in tool result messages are tolerated. ([@Yonom](https://github.com/Yonom))

- [#5208](https://github.com/assistant-ui/assistant-ui/pull/5208) [`a0ddc86`](https://github.com/assistant-ui/assistant-ui/commit/a0ddc862b0c506bd791238ebf800868e4836820a) - Adopt `erasableSyntaxOnly`; public enums are now `as const` objects. ([@Yonom](https://github.com/Yonom))

## 0.2.21

### Patch Changes

- [#5190](https://github.com/assistant-ui/assistant-ui/pull/5190) [`5412099`](https://github.com/assistant-ui/assistant-ui/commit/541209975bdc380edf7b34ecc270c201abd14788) - refactor: `ResourceElement<Result>` drops its args type parameter — elements are opaque descriptors; `Resource<Result, Args>` keeps the callable typing and `ContravariantResource` is removed ([@Yonom](https://github.com/Yonom))

- [#5079](https://github.com/assistant-ui/assistant-ui/pull/5079) [`390e417`](https://github.com/assistant-ui/assistant-ui/commit/390e4177ca47f7ece839613ad0f076add9313328) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.2.20

### Patch Changes

- [#4815](https://github.com/assistant-ui/assistant-ui/pull/4815) [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.2.19

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.2.18

### Patch Changes

- [#4392](https://github.com/assistant-ui/assistant-ui/pull/4392) [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda) - chore: update peer and dependency ranges for @assistant-ui/tap 0.9 ([@Yonom](https://github.com/Yonom))

- [#4392](https://github.com/assistant-ui/assistant-ui/pull/4392) [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda) - fix: preserve tap context across nested tap root rerenders and mark tap context as supported ([@Yonom](https://github.com/Yonom))

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
