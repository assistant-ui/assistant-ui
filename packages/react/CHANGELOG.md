# @assistant-ui/react

## 0.14.25

### Patch Changes

- [#4562](https://github.com/assistant-ui/assistant-ui/pull/4562) [`942931d`](https://github.com/assistant-ui/assistant-ui/commit/942931d52ddd34c66ed55a54908beee1cdfbfb6f) - fix: disable smooth text streaming under prefers-reduced-motion ([@ephraimduncan](https://github.com/ephraimduncan))

- Updated dependencies [[`a7b06f7`](https://github.com/assistant-ui/assistant-ui/commit/a7b06f76876078fc2fcbb92a86fa0e1530fde782)]:
  - safe-content-frame@0.0.22

## 0.14.24

### Patch Changes

- [#4543](https://github.com/assistant-ui/assistant-ui/pull/4543) [`d0987a3`](https://github.com/assistant-ui/assistant-ui/commit/d0987a32540880e5058ee529fd52a3efb4298706) - external-store: add `unstable_onBranchChange` adapter callback that fires on explicit `switchToBranch`, emitting the canonical (persisted) head and visible message ids, deduped by head ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#4545](https://github.com/assistant-ui/assistant-ui/pull/4545) [`4550578`](https://github.com/assistant-ui/assistant-ui/commit/4550578daddd4e811ed2823e7badeeddbe64d93c) - add unstable_useComposerInput headless bridge (value/setText/send/isDisabled/canSend) and unstable_useTriggerPopoverAriaProps for building a custom composer input without ComposerPrimitive.Input ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#4310](https://github.com/assistant-ui/assistant-ui/pull/4310) [`0c51b90`](https://github.com/assistant-ui/assistant-ui/commit/0c51b905d22418b93532636b1028c080ecc819e0) - feat: add `unstable_` interactables API; restore and deprecate the previous interactables API ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

  The redesigned interactables API is now available as an additive `unstable_*` surface for building editable, in-message UI while preserving the existing stable API for compatibility.

  - `unstable_useInteractable(name, config)` registers an interactable and returns its state plus methods in one hook.
  - Each unstable interactable name gets one stable `update_{name}` tool. When multiple instances share a name, the tool targets an instance by `id`.
  - Thread-scoped interactables rendered inside message parts expose `version`, including the state for that message, whether it is the latest tool-driven version, and `restore()`.
  - Added `unstable_interactableTool(...)` for defining a creating tool and its in-message render UI together.
  - Added `unstable_useInteractableVersions(id, name)` for version history UIs.
  - Persistence adapters can now provide `load()` and be passed directly to `unstable_Interactables({ persistence })`.

  The previous `useAssistantInteractable` / `useInteractableState` / `Interactables` API remains available unchanged and is marked deprecated. Existing apps do not need to migrate immediately.

  Migration notes for the unstable API:

  ```diff
  - const id = useAssistantInteractable("taskBoard", config);
  - const [state, { setState }] = useInteractableState(id, initialState);
  + const [state, { id, setState }] = unstable_useInteractable("taskBoard", config);
  ```

  - Use `unstable_interactables: unstable_Interactables()` when registering the unstable scope.
  - `unstable_useInteractableState(id)` is intended for secondary readers and returns `undefined` until the owner registers.
  - The unstable API uses per-name update tools (`update_{name}`) with an `id` parameter instead of legacy per-instance tools (`update_{name}_{id}`).
  - A top-level `id` field in `stateSchema` is reserved for instance addressing. Rename domain state fields to `itemId`, `recordId`, etc. if the model should edit them.
  - Model selection should be represented as ordinary state in the unstable API; the legacy `selected` registration prop and `setSelected` method remain available on the deprecated stable API.

- [#4591](https://github.com/assistant-ui/assistant-ui/pull/4591) [`f582f09`](https://github.com/assistant-ui/assistant-ui/commit/f582f0991258c96a15d542fc9e55a93866340eca) - feat: honor startRun false across staged-message-capable runtimes ([@Yonom](https://github.com/Yonom))

- [#4542](https://github.com/assistant-ui/assistant-ui/pull/4542) [`4acd4c0`](https://github.com/assistant-ui/assistant-ui/commit/4acd4c0f608da1c62bf23a666bc0fec870a27dca) - add unstable id-keyed thread message rendering APIs for virtualized and custom message lists. `unstable_useThreadMessageIds()` returns the thread's message ids (stable array identity across content-only updates), and `ThreadPrimitive.Unstable_MessageById` renders a single message by id with the same component surface as `MessageByIndex`. A missing or removed id renders `null` instead of throwing. ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- Updated dependencies [[`ddc40b7`](https://github.com/assistant-ui/assistant-ui/commit/ddc40b7791563057749ecf1121e15d19574479ff), [`ea52de0`](https://github.com/assistant-ui/assistant-ui/commit/ea52de06368853b7af7ac6755b157ec5305a8494), [`29c6fdb`](https://github.com/assistant-ui/assistant-ui/commit/29c6fdbc8ede04fb2647b0a47184003ee3c2f090), [`d0987a3`](https://github.com/assistant-ui/assistant-ui/commit/d0987a32540880e5058ee529fd52a3efb4298706), [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff), [`0c51b90`](https://github.com/assistant-ui/assistant-ui/commit/0c51b905d22418b93532636b1028c080ecc819e0), [`3a8f685`](https://github.com/assistant-ui/assistant-ui/commit/3a8f685e23a3e7ad76ac41e3ce6fff05714e04d3), [`ec6adf4`](https://github.com/assistant-ui/assistant-ui/commit/ec6adf4adc91fe12c7de47fc93adcc347ece8245), [`4acd4c0`](https://github.com/assistant-ui/assistant-ui/commit/4acd4c0f608da1c62bf23a666bc0fec870a27dca)]:
  - @assistant-ui/core@0.2.19
  - assistant-stream@0.3.24
  - assistant-cloud@0.1.34
  - @assistant-ui/store@0.2.19
  - @assistant-ui/tap@0.9.3

## 0.14.23

### Patch Changes

- [#4426](https://github.com/assistant-ui/assistant-ui/pull/4426) [`68dfbaa`](https://github.com/assistant-ui/assistant-ui/commit/68dfbaa348fba7ccec251c63d0c5cc8765e42a64) - chore: mark `generateId` and `fromThreadMessageLike` as experimental ([@okisdev](https://github.com/okisdev))

  these two utilities became public in [#4414](https://github.com/assistant-ui/assistant-ui/issues/4414). they now carry an `@deprecated` JSDoc noting the API is experimental and may change without notice, matching how the other unstable public utilities (e.g. `bindExternalStoreMessage`) are flagged. the distribution packages (`@assistant-ui/react`, `@assistant-ui/react-native`, `@assistant-ui/react-ink`) re-export them, so the annotation lands in their published types too.

- Updated dependencies [[`68dfbaa`](https://github.com/assistant-ui/assistant-ui/commit/68dfbaa348fba7ccec251c63d0c5cc8765e42a64), [`fe24ad6`](https://github.com/assistant-ui/assistant-ui/commit/fe24ad645e292cc77d9bdda6b0c18ccd8be23096)]:
  - @assistant-ui/core@0.2.18

## 0.14.22

### Patch Changes

- [#4414](https://github.com/assistant-ui/assistant-ui/pull/4414) [`344f737`](https://github.com/assistant-ui/assistant-ui/commit/344f7370511f7238db17e1982f2a43a10829604c) - feat: export `fromThreadMessageLike` and `generateId` from the public API ([@okisdev](https://github.com/okisdev))

  these two utilities were only reachable via `@assistant-ui/core/internal`, so materializing a `ThreadMessageLike` into a `ThreadMessage`, or generating an id for a hand-built message, meant reaching into internals (the first-party ag-ui and a2a runtimes already did). they are now exported from `@assistant-ui/core`, `@assistant-ui/react`, `@assistant-ui/react-native`, and `@assistant-ui/react-ink`. also removes the now-redundant duplicate listing of both from the unstable `INTERNAL` namespace (the one in-repo consumer, the with-ffmpeg example, now uses the public export).

- [#4419](https://github.com/assistant-ui/assistant-ui/pull/4419) [`3cef745`](https://github.com/assistant-ui/assistant-ui/commit/3cef74559e683f6ce703e77af0959338e0c3f96d) - feat(react): add `minCommitMs` to `SmoothOptions` to throttle committed reveal updates ([@okisdev](https://github.com/okisdev))

  `useSmooth` keeps advancing the typewriter reveal every frame, but with `minCommitMs` the visible text (and the downstream re-render and markdown re-parse it triggers) is committed at most once per interval. The final frame always commits, so no characters are lost. Defaults to `0`, which commits every frame and preserves the previous behavior.

- [#4411](https://github.com/assistant-ui/assistant-ui/pull/4411) [`d76a922`](https://github.com/assistant-ui/assistant-ui/commit/d76a922cb718e6bfb773c63502335a367cd73562) - feat: add `unstable_useLiveCompletionAdapter` for async trigger completions ([@okisdev](https://github.com/okisdev))

  bridges an async completion source (a server search, a gateway RPC) into the synchronous `Unstable_TriggerAdapter`. `search` returns cached items synchronously and schedules a debounced fetch with stale-request cancellation; when results land the adapter re-creates so the popover re-renders. also adds an `isLoading` prop on `ComposerPrimitive.Unstable_TriggerPopover` (surfaced on the popover scope) so async sources can render a loading state.

- Updated dependencies [[`344f737`](https://github.com/assistant-ui/assistant-ui/commit/344f7370511f7238db17e1982f2a43a10829604c), [`a2e21ee`](https://github.com/assistant-ui/assistant-ui/commit/a2e21ee797761907db9b7e4559da2a41afd00fc9)]:
  - @assistant-ui/core@0.2.17

## 0.14.21

### Patch Changes

- [#4403](https://github.com/assistant-ui/assistant-ui/pull/4403) [`9f59d69`](https://github.com/assistant-ui/assistant-ui/commit/9f59d694ccf2e0317f48efbb078f36b87be8dc62) - fix: prevent compiled context store hooks from skipping subscriptions ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`8d3b0e8`](https://github.com/assistant-ui/assistant-ui/commit/8d3b0e8aade47116d9616d8dac2328e0bb73f296)]:
  - @assistant-ui/tap@0.9.2

## 0.14.20

### Patch Changes

- [#4393](https://github.com/assistant-ui/assistant-ui/pull/4393) [`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d) - fix: resolve typecheck regressions ([@Yonom](https://github.com/Yonom))

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4392](https://github.com/assistant-ui/assistant-ui/pull/4392) [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda) - chore: update peer and dependency ranges for @assistant-ui/tap 0.9 ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d), [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668), [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda), [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda)]:
  - assistant-stream@0.3.23
  - @assistant-ui/core@0.2.16
  - assistant-cloud@0.1.33
  - @assistant-ui/tap@0.9.1
  - @assistant-ui/store@0.2.18

## 0.14.19

### Patch Changes

- [#4385](https://github.com/assistant-ui/assistant-ui/pull/4385) [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff) - feat: precompile packages with React Compiler ([@Yonom](https://github.com/Yonom))
  - aui-build runs React Compiler over packages that depend on tap and remaps `react/compiler-runtime` to the tap shim subpath, so compiled hooks and components work both in React components and inside tap resource renders
  - `@assistant-ui/tap/react-shim` exports `useMemoCache` (tap inside a resource render, `React.__COMPILER_RUNTIME.c` otherwise, with a React 18 polyfill); new `@assistant-ui/tap/react-shim/compiler-runtime` subpath mirrors `react/compiler-runtime`'s `c` export
  - tap implements `useSyncExternalStore` and a no-op `useDebugValue`; `useSubscribable` now builds on `useSyncExternalStore` so its store reads stay visible to the compiler
  - `AssistantProviderBase` opts out via `"use no memo"` because the runtime receives options through an effect inside a re-rendered child element

- [#4378](https://github.com/assistant-ui/assistant-ui/pull/4378) [`4583ca7`](https://github.com/assistant-ui/assistant-ui/commit/4583ca7477c834ef0906e7268005b469c7300cbe) - feat: approval options vocabulary on tool approvals. `ToolCallMessagePart.approval` gains request-supplied `options` (machine-readable kinds allow-once / allow-always / reject-once / reject-always, open to `_`-prefixed custom kinds), a recorded `optionId`, and a terminal `resolution` ("cancelled" | "expired") for non-decision outcomes. `respondToApproval` additionally accepts `{ optionId }`, resolved in core against the option's kind; custom kinds require an explicit `approved`. `ExternalThread` gains an `onRespondToToolApproval` callback. The kit approval bar renders supplied options with an opt-in confirmation step showing the grants an option would persist. Persistence stays host-owned. ([@okisdev](https://github.com/okisdev))

- [#4379](https://github.com/assistant-ui/assistant-ui/pull/4379) [`94cc028`](https://github.com/assistant-ui/assistant-ui/commit/94cc02875b4e813e1af7020709511bb5f61e6067) - feat: per-tool-call timing and stall detection. `ToolCallMessagePart` gains a `timing` field (`{ startedAt, completedAt? }` in epoch ms), auto-populated by the assistant-stream accumulator at part start and result, and accepted on `ThreadMessageLike` for external-store hosts. New `useToolCallElapsed()` hook returns the call's elapsed milliseconds, ticking once per second while running; `unstable_useMessageStallDetection({ thresholdMs })` reports mid-run output stalls by watching a message content fingerprint. The kit `ToolFallback` trigger renders the duration when timing is present. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`c207bcd`](https://github.com/assistant-ui/assistant-ui/commit/c207bcda24468c1ae6e5adb61054a3682d3ff1d8), [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff), [`9f13fdb`](https://github.com/assistant-ui/assistant-ui/commit/9f13fdb22d0bc1bf2ad001147b8acc0df4844302), [`4583ca7`](https://github.com/assistant-ui/assistant-ui/commit/4583ca7477c834ef0906e7268005b469c7300cbe), [`94cc028`](https://github.com/assistant-ui/assistant-ui/commit/94cc02875b4e813e1af7020709511bb5f61e6067)]:
  - @assistant-ui/core@0.2.15
  - @assistant-ui/tap@0.8.1
  - @assistant-ui/store@0.2.17
  - assistant-stream@0.3.22

## 0.14.18

### Patch Changes

- [#4352](https://github.com/assistant-ui/assistant-ui/pull/4352) [`14aa2ac`](https://github.com/assistant-ui/assistant-ui/commit/14aa2accbb384eafd5edd731c88d55cade027517) - feat: `unstable_useComposerInputHistory` ([@okisdev](https://github.com/okisdev))

  terminal-style input history for the thread composer: ArrowUp on an empty draft recalls previously sent user messages (newest first, derived live from thread state), ArrowDown steps back and finally restores the in-progress draft. spread the returned `{ onKeyDown }` bundle onto `ComposerPrimitive.Input`. yields to open trigger popovers, IME composition, modifiers, selections, and consumer handlers that already prevented the event; inert on edit composers.

- [#4340](https://github.com/assistant-ui/assistant-ui/pull/4340) [`ab8e5bc`](https://github.com/assistant-ui/assistant-ui/commit/ab8e5bc8650b1e39c8f01ab6c0efb80aa8baf723) - fix: exclude reasoning parts from copied message text ([@serhiizghama](https://github.com/serhiizghama))

  `getCopyText` filtered parts with `"text" in part`, which also matched `reasoning` parts (they carry a `text` field), leaking the model's chain-of-thought into the clipboard. Both copy paths now delegate to the canonical `getThreadMessageText`, so copy returns only `type: "text"` content — consistent with the rest of the runtime.

- [#4359](https://github.com/assistant-ui/assistant-ui/pull/4359) [`59d252f`](https://github.com/assistant-ui/assistant-ui/commit/59d252fa09c1511acd7e31c9d8178514c5a5cb77) - feat: branch switching for the ExternalThread client ([@okisdev](https://github.com/okisdev))

  `ExternalThread` accepts an optional `branches` adapter (`ExternalThreadBranchAdapter` in `@assistant-ui/core`, re-exported from `@assistant-ui/react`): `getBranches(messageId)` returns ordered sibling branch ids and `switchToBranch(branchId)` makes a sibling visible by swapping the `messages` array. messages with more than one sibling get real `branchNumber`/`branchCount`, which is what shows the branch picker; `capabilities.switchToBranch` is set for parity with the legacy external store. without the adapter, behavior is unchanged.

- [#4329](https://github.com/assistant-ui/assistant-ui/pull/4329) [`2b96cb5`](https://github.com/assistant-ui/assistant-ui/commit/2b96cb5e696222f7cd190c604375df79739ad943) - fix: emit the GroupedParts streaming indicator for empty running messages, so the assistant slot shows a loading affordance immediately after sending instead of staying blank ([@okisdev](https://github.com/okisdev))

- [#4329](https://github.com/assistant-ui/assistant-ui/pull/4329) [`2b96cb5`](https://github.com/assistant-ui/assistant-ui/commit/2b96cb5e696222f7cd190c604375df79739ad943) - fix: compensate scrollbar gutter in useScrollLock so collapsible animations don't shift centered content horizontally on classic scrollbars ([@okisdev](https://github.com/okisdev))

- [#4350](https://github.com/assistant-ui/assistant-ui/pull/4350) [`42fd04f`](https://github.com/assistant-ui/assistant-ui/commit/42fd04f0b1012a1bee153a50639f1286ca9a4fbe) - feat: public, tunable `useSmooth` ([@okisdev](https://github.com/okisdev))

  `useSmooth` and a new `SmoothOptions` type are now exported from `@assistant-ui/react` (previously internal-only with a hard-coded reveal rate). the `smooth` prop on `MessagePartPrimitive.Text` and `MarkdownTextPrimitive` widens to `boolean | SmoothOptions`, with `drainMs` (backlog drain target, default 250), `maxCharIntervalMs` (slowest reveal interval, default 5), and `maxCharsPerFrame` (per-frame cap, default unlimited). the hook also now preserves the part type for reasoning parts instead of always returning `type: "text"`. react-markdown's `@assistant-ui/react` peer floor moves to the release that ships `SmoothOptions`.

- [#4325](https://github.com/assistant-ui/assistant-ui/pull/4325) [`5a4f20e`](https://github.com/assistant-ui/assistant-ui/commit/5a4f20e75dcd93aeb70a4a5582a0a5a1f870b4f2) - chore: update @assistant-ui/tap dependency ranges to ^0.7.0 ([@Yonom](https://github.com/Yonom))

- [#4329](https://github.com/assistant-ui/assistant-ui/pull/4329) [`2b96cb5`](https://github.com/assistant-ui/assistant-ui/commit/2b96cb5e696222f7cd190c604375df79739ad943) - fix: clear pending viewport bottom-scroll intent on pointer interaction, preventing collapsible expand/collapse from yanking the thread to the bottom ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`ab8e5bc`](https://github.com/assistant-ui/assistant-ui/commit/ab8e5bc8650b1e39c8f01ab6c0efb80aa8baf723), [`59d252f`](https://github.com/assistant-ui/assistant-ui/commit/59d252fa09c1511acd7e31c9d8178514c5a5cb77), [`feecac3`](https://github.com/assistant-ui/assistant-ui/commit/feecac38c6ba0f8f30ec356376d1d6b19188e08f), [`3e58253`](https://github.com/assistant-ui/assistant-ui/commit/3e5825369c7206f4df3532d5fabfbe5cf5e4fd40), [`12b016b`](https://github.com/assistant-ui/assistant-ui/commit/12b016bd14560c847dadae075edb57631ac9c516), [`3e58253`](https://github.com/assistant-ui/assistant-ui/commit/3e5825369c7206f4df3532d5fabfbe5cf5e4fd40), [`5a4f20e`](https://github.com/assistant-ui/assistant-ui/commit/5a4f20e75dcd93aeb70a4a5582a0a5a1f870b4f2), [`f10b8ae`](https://github.com/assistant-ui/assistant-ui/commit/f10b8ae6659ed8df8b0c25b5bb2bb8cfa7d7a718), [`1fb5862`](https://github.com/assistant-ui/assistant-ui/commit/1fb586241534064fa48e3498f422bdaa7f382139)]:
  - @assistant-ui/core@0.2.14
  - @assistant-ui/store@0.2.16
  - @assistant-ui/tap@0.7.1

## 0.14.17

### Patch Changes

- [#4315](https://github.com/assistant-ui/assistant-ui/pull/4315) [`60ef0e9`](https://github.com/assistant-ui/assistant-ui/commit/60ef0e9ed26ceab722468332ff93c4751cc631fb) - feat: add runtime support for deleting messages ([@Yonom](https://github.com/Yonom))

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

- Updated dependencies [[`60ef0e9`](https://github.com/assistant-ui/assistant-ui/commit/60ef0e9ed26ceab722468332ff93c4751cc631fb), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b)]:
  - @assistant-ui/core@0.2.13
  - @assistant-ui/tap@0.6.2
  - @assistant-ui/store@0.2.15

## 0.14.16

### Patch Changes

- Updated dependencies:
  - @assistant-ui/core@0.2.12
  - @assistant-ui/tap@0.6.1

## 0.14.15

### Patch Changes

- [#4260](https://github.com/assistant-ui/assistant-ui/pull/4260) [`19c5b5f`](https://github.com/assistant-ui/assistant-ui/commit/19c5b5f3b1616a82ddfa928325c5e02c5786e867) - fix: make defineToolkit usable for plain runtime toolkits ([@Yonom](https://github.com/Yonom))

- [#4246](https://github.com/assistant-ui/assistant-ui/pull/4246) [`dbdfb15`](https://github.com/assistant-ui/assistant-ui/commit/dbdfb15e8b609d3886c71fedb25a9d8345e5fc3c) - feat: message queuing for external-store, langgraph, and local runtimes ([@okisdev](https://github.com/okisdev))

  the composer can now stay usable while a run is in progress: a message sent during a run is held in `composer.queue` (rendered via `ComposerPrimitive.Queue` / `QueueItemPrimitive.*`) and processed once the run settles. external-store adapters opt in by providing a `queue` adapter (typically built with the new `createMessageQueue` helper); `useLangGraphRuntime` and `useLocalRuntime` opt in via `unstable_enableMessageQueue`. `ExternalThreadQueueAdapter` now lives in `@assistant-ui/core` (still re-exported from `@assistant-ui/react`).

- [#4249](https://github.com/assistant-ui/assistant-ui/pull/4249) [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec) - feat: add externalTool for render-only generative toolkit entries ([@Yonom](https://github.com/Yonom))

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4280](https://github.com/assistant-ui/assistant-ui/pull/4280) [`e7f1aa0`](https://github.com/assistant-ui/assistant-ui/commit/e7f1aa0958202125352e3653d64ef586a5880298) - fix(mcp-apps): send the 2026-01-26 dialect on host→app messages so widgets built with `@modelcontextprotocol/ext-apps` initialize and receive tool results ([@okisdev](https://github.com/okisdev))

  the bridge already normalized inbound `ui/*` method names, but every outbound message (the `ui/initialize` result and the tool input/result/host context notifications) stayed in the pre-spec dialect. spec widgets zod-validate the initialize result and require `hostInfo` + `hostCapabilities`, so they failed init; tool results were posted as `notifications/tools/call/result`, a method the official SDK never listens for, so a patched widget still rendered empty. the bridge now additively dual-sends both dialects (the initialize result carries `host`/`capabilities` and `hostInfo`/`hostCapabilities`, echoes the app's requested `protocolVersion`, and each notification posts its `ui/notifications/*` counterpart with the spec param shapes). unknown methods and fields are ignored by either SDK, so legacy widgets are unaffected.

- [#4256](https://github.com/assistant-ui/assistant-ui/pull/4256) [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60) - feat: rename hitlTool to humanTool while keeping deprecated compatibility aliases ([@Yonom](https://github.com/Yonom))

- [#4298](https://github.com/assistant-ui/assistant-ui/pull/4298) [`72494e7`](https://github.com/assistant-ui/assistant-ui/commit/72494e75f2a535141a2bb26c539cf1b02b514377) - refactor: extract a shared sandbox host (SafeContentFrame lifecycle, the single cross-origin guarded message listener, auto-resize) and reuse it for the MCP app frame, with no behavior change ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`2a84174`](https://github.com/assistant-ui/assistant-ui/commit/2a8417422996920c4a58be80eddc1c1740158518), [`a0a0769`](https://github.com/assistant-ui/assistant-ui/commit/a0a076915dafdb7152c9fde75b40cfddebcb2676), [`19c5b5f`](https://github.com/assistant-ui/assistant-ui/commit/19c5b5f3b1616a82ddfa928325c5e02c5786e867), [`dbdfb15`](https://github.com/assistant-ui/assistant-ui/commit/dbdfb15e8b609d3886c71fedb25a9d8345e5fc3c), [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec), [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc), [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60), [`01cf957`](https://github.com/assistant-ui/assistant-ui/commit/01cf957c209b1a58c69f5621565397de6d1eb794), [`01cf957`](https://github.com/assistant-ui/assistant-ui/commit/01cf957c209b1a58c69f5621565397de6d1eb794), [`26a365b`](https://github.com/assistant-ui/assistant-ui/commit/26a365bb2b5bf840e21cd0caf1870627fb57c045)]:
  - @assistant-ui/core@0.2.11
  - assistant-stream@0.3.21
  - assistant-cloud@0.1.32
  - safe-content-frame@0.0.21
  - @assistant-ui/store@0.2.14
  - @assistant-ui/tap@0.6.0

## 0.14.14

### Patch Changes

- [#4212](https://github.com/assistant-ui/assistant-ui/pull/4212) [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84) - feat: add MCP server support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4213](https://github.com/assistant-ui/assistant-ui/pull/4213) [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab) - feat: add provider-executed tool support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4127](https://github.com/assistant-ui/assistant-ui/pull/4127) [`606c9d4`](https://github.com/assistant-ui/assistant-ui/commit/606c9d41f515925ed531876d451e53a564cc4253) - feat(assistant-transport): honour `Aui-Replay-Content-Length` to split sync-server replay from live bytes ([@Yonom](https://github.com/Yonom))

  `useAssistantTransportRuntime` now reads the `Aui-Replay-Content-Length` response header on resume and gates the body at that byte boundary. The replay prefix is decoded while `isLoading: true` has rendered through React, then the reader pauses until `isLoading: false` has rendered before releasing live bytes. Tool calls in the replayed portion are recorded as historical and skip `streamCall` / `execute`, while tool calls that begin after the replay boundary fire normally. Responses without the header behave as today.

- [#4208](https://github.com/assistant-ui/assistant-ui/pull/4208) [`0558db2`](https://github.com/assistant-ui/assistant-ui/commit/0558db28952fcd1c05a2ea3f15020cf50ca52489) - feat: add `updateCustom` to thread list runtimes, adapters, and clients ([@okisdev](https://github.com/okisdev))

- [#4214](https://github.com/assistant-ui/assistant-ui/pull/4214) [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46) - feat: add renderText helpers for tool call status text ([@Yonom](https://github.com/Yonom))

- [#4199](https://github.com/assistant-ui/assistant-ui/pull/4199) [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47) - feat: a `defineToolkit` entry may now be an already-formed `ToolDefinition` (carrying its own `type`), not only an inline definition whose `type` the compiler infers. This is what lets a factory like `new JSONGenerativeUI({ library }).present()` be used directly as a tool. ([@Yonom](https://github.com/Yonom))

  Renames the authoring types to match `defineToolkit`: `ToolkitDeclaration` → `ToolkitDefinition`, and adds `ToolkitDefinitionEntry` (the union of an inline tool definition and a pre-formed `ToolDefinition`). The per-tool inline type is now an internal `ToolkitDefinitionInput` and is no longer exported.

- [#4236](https://github.com/assistant-ui/assistant-ui/pull/4236) [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb) - feat: add `stubTool()` and experimental `useAuiToolOverrides()` for locally executed generative toolkit tools ([@Yonom](https://github.com/Yonom))

- [#4235](https://github.com/assistant-ui/assistant-ui/pull/4235) [`7640b31`](https://github.com/assistant-ui/assistant-ui/commit/7640b319f704414bd5eb197f34e11ae0b2324a1d) - Deprecate component tool registration APIs in favor of toolkit registrations. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`cba2b42`](https://github.com/assistant-ui/assistant-ui/commit/cba2b42c26083e730ae07194186ab4473f9f4cf3), [`4145caa`](https://github.com/assistant-ui/assistant-ui/commit/4145caaa23452f38c71366b55c03f8ec4da3fd54), [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0), [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`0558db2`](https://github.com/assistant-ui/assistant-ui/commit/0558db28952fcd1c05a2ea3f15020cf50ca52489), [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46), [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47), [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb), [`7640b31`](https://github.com/assistant-ui/assistant-ui/commit/7640b319f704414bd5eb197f34e11ae0b2324a1d)]:
  - assistant-stream@0.3.20
  - @assistant-ui/core@0.2.10
  - assistant-cloud@0.1.31

## 0.14.13

### Patch Changes

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: add the `ToolkitDeclaration` / `ToolkitDeclarationDefinition` types for authoring a toolkit permissively (a backend tool may declare `description`/`parameters`/`execute`); the canonical `Toolkit` keeps those fields erased. Author with `defineToolkit()` from `@assistant-ui/react`, which the `"use generative"` compiler strips per build. ([@Yonom](https://github.com/Yonom))

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: move the `defineToolkit` and `hitl` use-generative markers from `@assistant-ui/next` into `@assistant-ui/core/react`, so they ship once from every distribution (`@assistant-ui/react`, `@assistant-ui/react-native`, `@assistant-ui/react-ink`) and stay portable across build targets. Import them from `@assistant-ui/react` instead of `@assistant-ui/next`; they remain no-op markers stripped at build time by a `"use generative"` compiler. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e), [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e)]:
  - assistant-stream@0.3.19
  - @assistant-ui/core@0.2.9

## 0.14.12

### Patch Changes

- [#4172](https://github.com/assistant-ui/assistant-ui/pull/4172) [`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92) - feat: add the `ToolkitDeclaration` / `ToolkitDeclarationDefinition` types for authoring a toolkit permissively (a backend tool may declare `description`/`parameters`/`execute`); the canonical `Toolkit` keeps those fields erased. Author with `defineToolkit()` from `@assistant-ui/next`, which the `"use generative"` compiler strips per build. ([@Yonom](https://github.com/Yonom))

- [#4151](https://github.com/assistant-ui/assistant-ui/pull/4151) [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3) - chore: drop stale `biome-ignore` pragmas now that the repo lints with oxlint ([@okisdev](https://github.com/okisdev))

- [#4136](https://github.com/assistant-ui/assistant-ui/pull/4136) [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b) - centralize thread-level shared options forwarding across runtime wrapper hooks. follow-up to [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). ([@okisdev](https://github.com/okisdev))

  new public exports from `@assistant-ui/core` (re-exported from `@assistant-ui/react`):
  - `ExternalStoreSharedOptions`, a typed `Pick` over `ExternalStoreAdapter` covering the four thread-level optional fields every wrapper forwards: `isDisabled`, `isSendDisabled`, `unstable_capabilities`, `suggestions`.
  - `pickExternalStoreSharedOptions(options)`, plucks those four fields from a wider options object. the body uses `satisfies Required<...>` so adding a key to the type without copying it in the function is a compile error rather than a silent missing-field bug.
  - `useExternalStoreSharedOptions(options)` (from `@assistant-ui/core/react`), a memoized variant for wrappers that wrap their store in `useMemo`. lets the wrapper list a single stable `shared` reference as a dep instead of enumerating the four fields. same `satisfies` guard internally so the destructure stays in sync with the type.

  internal: every runtime wrapper hook (`useChatRuntime`, `useAISDKRuntime`, `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime`) now uses these helpers instead of inlining the conditional spreads added in [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). each wrapper sheds 20 to 40 lines of duplicated declarations and conditional spreads; future additions to the shared option set propagate through a single edit in `pickExternalStoreSharedOptions` instead of touching every wrapper. no user-facing behavior change.

- [#4141](https://github.com/assistant-ui/assistant-ui/pull/4141) [`0b99959`](https://github.com/assistant-ui/assistant-ui/commit/0b999594ff30ded9f804896093eab0478ac5ce46) - fix(react): stop subtree mutations from snapping a scrolled-up viewport back to bottom; loosen at-bottom threshold for high-DPR displays ([@vaniyokk](https://github.com/vaniyokk))

  `useThreadViewportAutoScroll` had two related bugs surfaced on Chrome macOS at `devicePixelRatio: 2`:
  1. subtree mutations snapped the viewport back to bottom after the user scrolled away. `scrollingToBottomBehaviorRef` was planted on `thread.runStart` / `useOnScrollToBottom` / initialize / thread switch and only cleared in `handleScroll` once `newIsAtBottom` became true. while the ref stayed set, every non-style subtree mutation (a Radix `data-state` flip, a markdown re-render, an image lazy-load, an attribute toggle on a child) re-entered `useOnResizeContent`'s callback and called `scrollToBottom(scrollBehavior)`, locking the viewport to the bottom until reload.
  2. `isAtBottom` never registered as `true` on high-DPR displays. `Math.abs(scrollHeight - scrollTop - clientHeight) < 1` is strict-less-than, and Chrome macOS at `devicePixelRatio: 2` clips `scrollTop` one pixel short of `scrollHeight - clientHeight` (`Math.abs(1) < 1 === false`), so the store never updated and `ScrollToBottom` never moved into its disabled state.

  the fix combines two layers. `handleScroll` now tracks `lastScrollHeight` alongside `lastScrollTop` and releases the auto-stick intent when the user scrolls up with content size unchanged, ruling out content-driven scrollTop shifts. the resize callback also bails when neither `scrollHeight` nor `clientHeight` has changed since the last fire, so mutations that don't move layout never re-enter the snap path. at-bottom auto-follow during streaming is preserved (verified by appending a synthetic 600px child while scrolled to bottom; viewport follows to new bottom). the threshold becomes `<= 1` to absorb the 1px sub-pixel clip.

  closes [#4140](https://github.com/assistant-ui/assistant-ui/issues/4140).

- [#4160](https://github.com/assistant-ui/assistant-ui/pull/4160) [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b) - feat: add `indicator` support to `MessagePrimitive.GroupedParts`. ([@Yonom](https://github.com/Yonom))

  Restores loading-state handling that was dropped from the grouped renderer. `GroupedParts` now emits a synthetic `{ part: { type: "indicator" } }` render call you handle with `case "indicator"` in your `switch (part.type)` — render a "thinking…" dot or any loading affordance.
  - The indicator is only ever emitted while the message is **running**, so its presence alone means "render loading UI here" — there's no `status` to branch on.
  - New `indicator` prop restricts which running states qualify: `"never"`, `"empty"` (no parts yet), `"no-text"` (default — last part isn't `text`/`reasoning`, e.g. the model ended on a tool call), or `"always"` (any running state).

- [#4162](https://github.com/assistant-ui/assistant-ui/pull/4162) [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe) - fix: drop phantom sibling messages when an external store swaps an optimistic message id mid-run ([#4037](https://github.com/assistant-ui/assistant-ui/issues/4037)). ([@Yonom](https://github.com/Yonom))

  Messages can now be flagged `metadata.isOptimistic`. Optimistic messages are treated as ephemeral: they only ever live on the current head branch (the repository evicts off-branch optimistic messages whenever the head moves) and they are never written to persisted state (`export()` omits them). The AI SDK v6 adapter flags the streaming assistant message as optimistic, so when its client-generated id is replaced by a server-provided one mid-run, the stale placeholder no longer lingers as a phantom branch (e.g. `BranchPicker` showing `2/2` on a turn the user never branched). Unlike the reverted blanket id-diff ([#4040](https://github.com/assistant-ui/assistant-ui/issues/4040)), only explicitly-optimistic messages are affected, so legitimate `onEdit` / `onReload` / `switchToBranch` branches are preserved.

- [#4175](https://github.com/assistant-ui/assistant-ui/pull/4175) [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4148](https://github.com/assistant-ui/assistant-ui/pull/4148) [`2d9595e`](https://github.com/assistant-ui/assistant-ui/commit/2d9595e04977ca16fb7edb1295309831945f4914) - revert: roll back [#4040](https://github.com/assistant-ui/assistant-ui/issues/4040) (drop phantom siblings on external-store id swap). the `_lastSyncedMessageIds` diff was deleting legitimate sibling branches created by `onEdit` / `onReload` / `switchToBranch`, causing `BranchPicker` to disappear on edits and reloads ([#4131](https://github.com/assistant-ui/assistant-ui/issues/4131)). this revert restores the additive sync behavior; the AI SDK v6 mid-stream id swap ([#4037](https://github.com/assistant-ui/assistant-ui/issues/4037)) regresses and will be addressed in the AI SDK adapter instead. ([@okisdev](https://github.com/okisdev))

- [#4167](https://github.com/assistant-ui/assistant-ui/pull/4167) [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d) - feat: add a `display` presentation hint to tools and a `"standalone-tool-call"` key to `groupPartByType`. ([@Yonom](https://github.com/Yonom))

  Tool UIs fall into three buckets: prompting the user (human-in-the-loop), informing the user (generative UI), and traces of what the model is doing (routine frontend/backend tool calls). The first two should be surfaced on their own; the last belongs folded into the chain-of-thought trace. The new `display` field on a tool lets you place a tool in the right bucket without overloading `type`:

  ```ts
  const toolkit = {
    ask_user: { type: "human", render: AskUI }, // standalone (forced — can't opt out)
    search_web: { type: "frontend", render: SearchUI }, // inline trace (default)
    checkout: {
      type: "frontend",
      render: CheckoutUI,
      display: "standalone", // opt in
    },
  } satisfies Toolkit;
  ```

  - `display?: "standalone" | "inline"` is a client-only presentation hint (it never reaches the model). Defaults to `"inline"`.
  - `human` tools are always `"standalone"` and cannot opt out (the type only allows `"standalone"`). MCP-app tool calls and the built-in generative-UI tool are standalone too. Every other tool defaults to inline and opts in explicitly.
  - `groupPartByType` gains a synthetic `"standalone-tool-call"` key that matches all of the above. `MessagePrimitive.GroupedParts` passes the live tool-UI registry to the `groupBy` function as a second `context` argument (`{ toolUIs }`), and the helper reads it to resolve the registry-driven cases; MCP-app calls are detected from the part alone.
  - The `"mcp-app"` key on `groupPartByType` is **deprecated** in favor of `"standalone-tool-call"` (a superset). It still works for back-compat.

  The shadcn `thread.tsx` template is updated to use `"standalone-tool-call": []` in place of `"mcp-app": []`.

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b), [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b), [`76f7d16`](https://github.com/assistant-ui/assistant-ui/commit/76f7d161c2d802b72e07a12f67595f94c9ad7e4d), [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d), [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652), [`331f2f7`](https://github.com/assistant-ui/assistant-ui/commit/331f2f7f432285fd0cdc14e0862b550e5d15769e)]:
  - assistant-stream@0.3.18
  - @assistant-ui/core@0.2.8
  - @assistant-ui/store@0.2.13
  - @assistant-ui/tap@0.5.14
  - assistant-cloud@0.1.30

## 0.14.11

### Patch Changes

- [#4125](https://github.com/assistant-ui/assistant-ui/pull/4125) [`e639a11`](https://github.com/assistant-ui/assistant-ui/commit/e639a11838642aa111644077ba51acf6277051f2) - chore: drop tracker-behaviour explainer comments left behind in satellite runtimes ([@Yonom](https://github.com/Yonom))

## 0.14.10

### Patch Changes

- [#4118](https://github.com/assistant-ui/assistant-ui/pull/4118) [`a6e0653`](https://github.com/assistant-ui/assistant-ui/commit/a6e0653bad29fb93627646a77c3383000c57ee33) - feat(core): build a client-side tool-invocations pipeline directly into `useExternalStoreRuntime`. Tool-call parts in messages now fire `streamCall` / `execute` automatically for any external-store runtime that opts in. Opt in per-adapter via `unstable_enableToolInvocations: true` (off by default — most external-store runtimes either run tools server-side or already wire their own client-side dispatch path; double-firing is the risk). The `_store.isLoading` flag signals when initial history is loaded: snapshots observed while `isLoading === true` are treated as historical (no fire), matching the contract that callers like `importExternalState` already rely on. Six in-tree runtimes (`useAssistantTransportRuntime`, `useAISDKRuntime`, `useLangGraphRuntime`, `useStreamRuntime`, `useAgUiRuntime`, `useAdkRuntime`) are migrated to the embedded tracker; the standalone `useToolInvocations` React hook is removed. Adds `ExternalStoreAdapter.setToolStatuses` so adapters can mirror the tracker's per-tool-call status into local React state for converter metadata. Auto-aborts in-flight tool calls on new turns (`append()` with `startRun`, `startRun()`) so a tool that finishes after the user moves on can no longer feed a stale result into the next turn. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`7395092`](https://github.com/assistant-ui/assistant-ui/commit/73950929dbebadb275e3bdee23331f65f2635a33), [`a6e0653`](https://github.com/assistant-ui/assistant-ui/commit/a6e0653bad29fb93627646a77c3383000c57ee33), [`cabfc71`](https://github.com/assistant-ui/assistant-ui/commit/cabfc715e99f23a55dc1276a6028792d7ecad822)]:
  - @assistant-ui/core@0.2.7
  - @assistant-ui/tap@0.5.13

## 0.14.9

### Patch Changes

- [#4120](https://github.com/assistant-ui/assistant-ui/pull/4120) [`372d4f0`](https://github.com/assistant-ui/assistant-ui/commit/372d4f0c538a766fd9a849fef74e413dde86d74a) - feat: simplify `MessagePrimitive.GroupedParts` API and add `groupPartByType` helper. ([@Yonom](https://github.com/Yonom))
  - New `groupPartByType({ ... })` helper builds a `groupBy` from a `part.type → group-key path` lookup. The map keys are typed against `PartState["type"]` (autocomplete + typo rejection), missing keys leave the part ungrouped, and the returned function carries an internal memo fingerprint so the tree survives unrelated re-renders even when reconstructed inline.
  - Special map key `"mcp-app"` matches tool-call parts that point at an assistant-ui MCP app resource (`ui://...`). It takes precedence over the `"tool-call"` entry for those parts, so MCP apps can be routed separately (e.g. rendered outside a chain-of-thought wrapper).
  - `groupBy` signature simplified from `(part, index, parts) => string | string[] | null | undefined` to `(part) => readonly \`group-${string}\`[] | null`. The 2nd/3rd args were unused in practice. Arrays are required (no bare-string shorthand); `null`is accepted as an alias for`[]` to soften the migration.
  - Internal memoization now uses the helper's memo fingerprint when present, otherwise rebuilds the tree per render (O(n), cheap). The previous "pass a stable reference" advice is dropped — inline `groupBy` is fine.
  - Docs and examples updated to lead with `groupPartByType`. The `getMcpAppFromToolPart` branch in `packages/ui` switches to `"mcp-app": []` via the helper.

- [#4107](https://github.com/assistant-ui/assistant-ui/pull/4107) [`32ae846`](https://github.com/assistant-ui/assistant-ui/commit/32ae846a91b61eccd01330693868a48f2f3bb0c4) - feat: surface AI SDK v6 tool approvals as a first-class `respondToApproval` prop on tool components. tool-call parts in the `approval-requested` state now carry `part.approval = { id, isAutomatic? }`; tool components call `respondToApproval({ approved, reason? })` to ack the gate without threading `chatHelpers` through application context. also fixes a transient `requires-action` flicker for the `approval-responded` state and tightens the external-message converter so interrupt vs pending tool calls are distinguished by an actual `interrupt`/`approval` field rather than by `result === undefined`. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`372d4f0`](https://github.com/assistant-ui/assistant-ui/commit/372d4f0c538a766fd9a849fef74e413dde86d74a), [`d4f1db4`](https://github.com/assistant-ui/assistant-ui/commit/d4f1db428b1a1fe5c122150e1e366a377e9adb5f), [`32ae846`](https://github.com/assistant-ui/assistant-ui/commit/32ae846a91b61eccd01330693868a48f2f3bb0c4)]:
  - @assistant-ui/core@0.2.6
  - assistant-stream@0.3.17

## 0.14.8

### Patch Changes

- [#4093](https://github.com/assistant-ui/assistant-ui/pull/4093) [`b02b701`](https://github.com/assistant-ui/assistant-ui/commit/b02b7012cff158b4e73b82503b9ea90638b7398d) - feat(react): `unstable_insertNewlineOnTouchEnter` on `ComposerPrimitive.Input` ([@okisdev](https://github.com/okisdev))

  When set, plain Enter on a touch-primary device — detected via the `(pointer: coarse) and (not (any-pointer: fine))` media query — inserts a newline instead of submitting. Messages then dispatch only via the explicit Send button, matching the chat-input convention used by WhatsApp, Slack, Discord, iMessage, ChatGPT, and Claude.ai, and avoiding the consumer-side caret-aware re-insertion dance the previous workaround required.

  Orthogonal to `submitMode`: only takes effect when `submitMode` resolves to `"enter"` (the default). A tablet paired with a hardware keyboard can still submit via `submitMode="ctrlEnter"` (Cmd/Ctrl+Enter), and `submitMode="none"` is unchanged.

  ```tsx
  <ComposerPrimitive.Input
    placeholder="Ask anything..."
    unstable_insertNewlineOnTouchEnter
  />
  ```

  Stays `unstable_` until we have enough field signal to flip the behavior on by default.

- [#3967](https://github.com/assistant-ui/assistant-ui/pull/3967) [`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c) - feat(core, react): add `MessagePrimitive.GenerativeUI` primitive ([@samdickson22](https://github.com/samdickson22))

  A new first-class primitive for rendering agent-described React UI from a JSON
  spec, with a consumer-provided component allowlist as the security boundary.

  The agent emits a new `generative-ui` message part containing a tree of
  components by name; `MessagePrimitive.GenerativeUI` walks the spec and resolves
  each name against the registry you pass in. Unknown names throw a typed
  `GenerativeUIRenderError` (or invoke the optional `Fallback`). Composes with
  `MessagePrimitive.Parts` via the new `components.generativeUI` option, and
  supports streaming partial specs.

  ```tsx
  <MessagePrimitive.Parts
    components={{
      generativeUI: { components: { Card, Button } },
    }}
  />
  ```

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4099](https://github.com/assistant-ui/assistant-ui/pull/4099) [`f2ec01c`](https://github.com/assistant-ui/assistant-ui/commit/f2ec01ce0f01317a8444b779d88f9b6a26d691c5) - feat(core, react): opt-out of auto-unarchive when switching threads ([@adityamohta](https://github.com/adityamohta))

  `switchToThread` (and `ThreadListItemRuntime.switchTo`) now accept an optional `{ unarchive?: boolean }` argument. The default remains `true`, preserving the existing behavior of auto-unarchiving an archived thread when it becomes the main thread. Pass `unarchive: false` to keep the thread archived after switching — useful when the UI lets users preview an archived conversation without restoring it.

  ```ts
  // existing behavior — archived thread becomes regular
  await threadList.switchToThread(threadId);

  // new — keep status as archived
  await threadList.switchToThread(threadId, { unarchive: false });

  // same option on the item runtime
  await threadListItem.switchTo({ unarchive: false });
  ```

- Updated dependencies [[`13a12c4`](https://github.com/assistant-ui/assistant-ui/commit/13a12c46c94f7e5e62af02692cf3479fff48bd02), [`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c), [`6a0ecb2`](https://github.com/assistant-ui/assistant-ui/commit/6a0ecb2e49f24c5f066052018db5a9f1411dcc59), [`e4634a5`](https://github.com/assistant-ui/assistant-ui/commit/e4634a59b7a926d158e929d559326f243efe438b), [`325de4c`](https://github.com/assistant-ui/assistant-ui/commit/325de4c73b348d4c20dafa4a2ac6d436c69dbf28), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`f2ec01c`](https://github.com/assistant-ui/assistant-ui/commit/f2ec01ce0f01317a8444b779d88f9b6a26d691c5), [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0)]:
  - assistant-stream@0.3.16
  - @assistant-ui/core@0.2.5
  - assistant-cloud@0.1.29
  - safe-content-frame@0.0.20
  - @assistant-ui/store@0.2.12
  - @assistant-ui/tap@0.5.12

## 0.14.7

### Patch Changes

- [#4073](https://github.com/assistant-ui/assistant-ui/pull/4073) [`44ac459`](https://github.com/assistant-ui/assistant-ui/commit/44ac45910cf49960ea0910cce32167d726a03ed1) - fix(react|useSmooth): render-phase resync of displayed text on part change ([@Yonom](https://github.com/Yonom))

  Drop one frame of stale text after a thread switch by resyncing
  `displayedText` in render when the part instance flips or `text`
  breaks its streaming-append continuity, instead of waiting for
  the post-commit effect.

- Updated dependencies [[`221d320`](https://github.com/assistant-ui/assistant-ui/commit/221d320cee987a4cd464c9cbae152d918197499e)]:
  - @assistant-ui/core@0.2.4

## 0.14.6

### Patch Changes

- [#4023](https://github.com/assistant-ui/assistant-ui/pull/4023) [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33) - docs: add React JSDoc and deprecation notices for primitive and tool APIs ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#3513](https://github.com/assistant-ui/assistant-ui/pull/3513) [`8b6fc88`](https://github.com/assistant-ui/assistant-ui/commit/8b6fc8836871e62efc2fd8c131c6783e12c5fc47) - fix: guard `navigator.clipboard` availability and swallow write rejections in `ActionBarPrimitive.Copy`. Previously, copy clicks in SSR, non-HTTPS contexts, or older browsers without the Clipboard API threw a `ReferenceError`, and permission-denied rejections surfaced as unhandled promise rejections. The web copyToClipboard implementation in `@assistant-ui/react` now early-rejects when the API is unavailable, and `useActionBarCopy` in `@assistant-ui/core` silently absorbs the rejection so the rest of the UI is unaffected. ([@JustAnOkapi](https://github.com/JustAnOkapi))

- [#4040](https://github.com/assistant-ui/assistant-ui/pull/4040) [`b481ec5`](https://github.com/assistant-ui/assistant-ui/commit/b481ec5129e6c1ae6de2683cdafdeecff1d8ed6b) - fix: `useExternalStoreRuntime` no longer leaves phantom assistant siblings when the external store swaps a message id between syncs (e.g. AI SDK v6 `useChat` replacing a client-generated id with a server-provided id mid-stream, surfacing as `BranchPicker` showing `2/2` on a turn the user never branched). The `messages`-array sync path now diffs against the previous sync and removes ids that disappeared, matching the `messageRepository` path's snapshot semantics. Closes [#4037](https://github.com/assistant-ui/assistant-ui/issues/4037). ([@okisdev](https://github.com/okisdev))

- [#4063](https://github.com/assistant-ui/assistant-ui/pull/4063) [`8f0dbb8`](https://github.com/assistant-ui/assistant-ui/commit/8f0dbb80a0c89c7406bad1ad397e75831b9b8fa7) - fix thread initialization timing race which caused `scrollToBottomOnInitialize` to fail in `useLocalRuntime` ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#3958](https://github.com/assistant-ui/assistant-ui/pull/3958) [`7a8bf26`](https://github.com/assistant-ui/assistant-ui/commit/7a8bf26eda76f5f8490f96b3ff9dce1ccd072917) - refactor: hoist `MessagePartPrimitiveInProgress` to `@assistant-ui/core/react` so `@assistant-ui/react`, `@assistant-ui/react-ink`, and other distributions can share the same implementation. `@assistant-ui/react`'s `MessagePartPrimitive.InProgress` is unchanged for callers; it now re-exports from core. ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4050](https://github.com/assistant-ui/assistant-ui/pull/4050) [`693922b`](https://github.com/assistant-ui/assistant-ui/commit/693922b182b876b28d986f528b21d33da7c5bb51) - fix(x-buildutils): include local `types/` in `typeRoots` so x-buildutils itself can resolve its ambient `browser-process` types ([@Yonom](https://github.com/Yonom))

  feat(react): re-export `Unstable_DirectiveFormatter`, `Unstable_DirectiveSegment`, `Unstable_TriggerItem`, and `unstable_defaultDirectiveFormatter` from `@assistant-ui/core` so downstream packages don't need to depend on `@assistant-ui/core` directly

- Updated dependencies [[`845c7c1`](https://github.com/assistant-ui/assistant-ui/commit/845c7c12fecbb448da7f1135c33163b653a50710), [`db721df`](https://github.com/assistant-ui/assistant-ui/commit/db721df32434296ac14eab27030628107975b71c), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`8b6fc88`](https://github.com/assistant-ui/assistant-ui/commit/8b6fc8836871e62efc2fd8c131c6783e12c5fc47), [`179895f`](https://github.com/assistant-ui/assistant-ui/commit/179895fdcb56edee2e8d9efb4b38cd3859eeecdd), [`7a8bf26`](https://github.com/assistant-ui/assistant-ui/commit/7a8bf26eda76f5f8490f96b3ff9dce1ccd072917), [`3b2bbce`](https://github.com/assistant-ui/assistant-ui/commit/3b2bbce1589b44a13b8b7a570c19bf35a2266fbd)]:
  - assistant-cloud@0.1.28
  - @assistant-ui/store@0.2.11
  - assistant-stream@0.3.15
  - @assistant-ui/core@0.2.3

## 0.14.5

### Patch Changes

- Accept the MCP-UI `2026-01-26` method names in the MCP App bridge (e.g. `ui/notifications/size-changed`, `ui/request-display-mode`, `ui/open-link`, `ui/message`). Widgets built with the current xmcp host-bridge emit these names; previously the host silently ignored them, leaving features like auto-resize broken (iframe never received a height change from `onSizeChange`).

## 0.14.4

### Patch Changes

- [#4033](https://github.com/assistant-ui/assistant-ui/pull/4033) [`552ffb0`](https://github.com/assistant-ui/assistant-ui/commit/552ffb0ed145f2e2a57db910b99dac5d5b834626) - feat(react): export `getMcpAppFromToolPart` so hosts can detect MCP-app tool parts ([@Yonom](https://github.com/Yonom))

- Updated dependencies []:
  - safe-content-frame@0.0.19

## 0.14.3

### Patch Changes

- [#4031](https://github.com/assistant-ui/assistant-ui/pull/4031) [`30f0357`](https://github.com/assistant-ui/assistant-ui/commit/30f035761bfb76fcb6c4c9e2db8fa6cc76036681) - feat(react): clamp MCP app auto-resize height to a configurable max (default 800px) ([@Yonom](https://github.com/Yonom))

## 0.14.2

### Patch Changes

- [#4024](https://github.com/assistant-ui/assistant-ui/pull/4024) [`19d4d94`](https://github.com/assistant-ui/assistant-ui/commit/19d4d9412234628ae850b4b04da594201022a398) - feat: add native MCP Apps renderer — `McpAppRenderer` composes into `Tools` to render MCP UI resources inline in chat over a JSON-RPC postMessage bridge on `SafeContentFrame`. Adds an `mcp` field to `ToolCallMessagePart` and forwards `callProviderMetadata.mcp.app` through the AI SDK message converter. ([@Yonom](https://github.com/Yonom))

- [#4022](https://github.com/assistant-ui/assistant-ui/pull/4022) [`4c3eaa1`](https://github.com/assistant-ui/assistant-ui/commit/4c3eaa1d5df8224916a392883ef18c89a84320c1) - fix(composer): apply WAI-ARIA combobox attributes to the textarea while a trigger popover is open ([@okisdev](https://github.com/okisdev))

  `Unstable_TriggerPopover` rendered the listbox half of the WAI-ARIA editable combobox pattern, but the focused element (the textarea) lacked the corresponding combobox attributes. screen readers had no way to announce that an autocomplete was open or which item was highlighted.

  `ComposerPrimitive.Input` now reads the active popover descriptor from `TriggerPopoverRoot` and applies `aria-controls`, `aria-expanded`, `aria-haspopup="listbox"`, and `aria-activedescendant` to the textarea while a popover is open. attributes are removed when the popover closes. consumers using `ComposerPrimitive.Input` outside a `TriggerPopoverRoot` are unaffected.

- [#4020](https://github.com/assistant-ui/assistant-ui/pull/4020) [`03694bd`](https://github.com/assistant-ui/assistant-ui/commit/03694bd397a86c34b3a91dc8acf2c677eb44e295) - fix(composer): select highlighted item on Tab in trigger popover ([@serhiizghama](https://github.com/serhiizghama))

  `ComposerPrimitive.Unstable_TriggerPopover` only accepted the highlighted entry on Enter. Tab fell through to the underlying textarea, moving focus out of the composer or inserting a tab character. This diverged from the autocomplete convention used in CLIs, IDEs, command palettes, GitHub, Slack, Discord, and Notion, where Tab accepts the highlighted suggestion.

  Tab now mirrors Enter and selects the highlighted item or category. Shift+Tab still passes through so native focus traversal keeps working.

- Updated dependencies [[`19d4d94`](https://github.com/assistant-ui/assistant-ui/commit/19d4d9412234628ae850b4b04da594201022a398)]:
  - @assistant-ui/core@0.2.2

## 0.14.1

### Patch Changes

- [#3984](https://github.com/assistant-ui/assistant-ui/pull/3984) [`35d0146`](https://github.com/assistant-ui/assistant-ui/commit/35d014628a69b0003799666895c2552b46ac7198) - feat(composer): expose `canSend` state and `isSendDisabled` adapter input ([@okisdev](https://github.com/okisdev))

  `ComposerState.canSend` (read-only) is now derivable via `useAuiState((s) => s.composer.canSend)` and `<AuiIf condition={(s) => s.composer.canSend}/>`. it reflects whether the composer is in a state where send is permitted; cross-thread gating (`isRunning`, `capabilities.queue`) continues to be layered on top by `useComposerSend`.

  `ExternalStoreAdapter.isSendDisabled` is a new optional input alongside `isDisabled`. when `true`, the thread composer's input remains usable but `send()` becomes a no-op and `canSend` is `false`. use this to gate sending on external React state (e.g. while tool config is loading) without disabling the input itself. edit composers (saving in-progress message edits) intentionally ignore this flag, since it is a thread-scoped gate.

  `BaseComposerRuntimeCore.send()` now early-returns when `!canSend`, so the `Cmd/Ctrl+Shift+Enter` steer hotkey, form-`requestSubmit()`, and direct `aui.composer().send()` calls are all gated by the same flag. the same gating is wired through the tap-based `ExternalThread` client via a new `isSendDisabled` prop on `ExternalThreadProps`.

- [#4008](https://github.com/assistant-ui/assistant-ui/pull/4008) [`fa4510a`](https://github.com/assistant-ui/assistant-ui/commit/fa4510a3f3a23e0458ce8f3a397c352e3b0cde07) - feat: support multi-modal tool results via `toModelOutput` ([@okisdev](https://github.com/okisdev))

  frontend tools can now project their execution output into multi-modal model content (text + image / pdf / arbitrary file parts), aligning with the AI SDK v6 `toModelOutput` callback. previously, tool results were always serialized as a single JSON value, so a "read pdf" style tool had no way to send the PDF back to a multi-modal model.
  - `assistant-stream` exports a new `ToolModelContentPart` type (`{ type: "text", text } | { type: "file", data, mediaType, filename? }`) and a `ToolModelOutputFunction<TArgs, TResult>` callback type. `Tool.toModelOutput` is wired through `unstable_runPendingTools` and `ToolExecutionStream`, attaching the resulting `modelContent` to the `tool-call` part on the assistant message.
  - `@assistant-ui/core` re-exports `ToolModelContentPart` and adds an optional `modelContent?: readonly ToolModelContentPart[]` field on `ToolCallMessagePart`. existing tools and renderers are unchanged.
  - `@assistant-ui/react-ai-sdk`'s `frontendTools(...)` helper now also registers a `toModelOutput` on each forwarded tool. it transparently unwraps an envelope that `useAISDKRuntime` writes when a frontend-executed tool produced `modelContent`, turning it into AI SDK's `{ type: "content", value: [...] }` output. plain (non-envelope) outputs fall back to the existing `{ type: "text" | "json", value }` shape, so behavior for tools without `toModelOutput` is unchanged.

  route handlers that adopt `toModelOutput` also need to pass `tools` to `convertToModelMessages` (this is the [AI SDK's documented pattern](https://ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages#multi-modal-tool-responses)):

  ```ts
  const aiSDKTools = { ...frontendTools(tools ?? {}) };
  streamText({
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    tools: aiSDKTools,
  });
  ```

  templates and existing examples are unchanged. they keep the simpler `convertToModelMessages(messages)` form because none of the tools they ship with use `toModelOutput`. the new tools guide page documents how to opt in.

  **reserved key.** when a frontend tool defines `toModelOutput`, its result is persisted in the AI SDK chat as `{ __aui_modelContent: ToolModelContentPart[], value: <your result> }`. tools must not return objects whose top-level key is literally `__aui_modelContent`, or `convertMessage` will misread the result. the prefix is namespaced for this reason.

  **read/write compatibility for persisted threads.** the envelope is recognized by `@assistant-ui/react-ai-sdk` from this version onward. if you persist UI messages and read them from multiple environments, upgrade every reader before any writer starts producing `toModelOutput`; otherwise older readers will treat the envelope object as the `result` and break the affected tool `render` functions.

- [#3634](https://github.com/assistant-ui/assistant-ui/pull/3634) [`9c3d24d`](https://github.com/assistant-ui/assistant-ui/commit/9c3d24d8a358bcf5f683f85473b82524ea018930) - Support AI SDK `source-document` parts by preserving them as assistant-ui ([@sicko7947](https://github.com/sicko7947))
  document source message parts across conversion and cloud serialization,
  including the legacy React cloud encoder.
- Updated dependencies [[`9ecda1d`](https://github.com/assistant-ui/assistant-ui/commit/9ecda1dfdd96f2c638e7b51cc951319ccacd06c9), [`35d0146`](https://github.com/assistant-ui/assistant-ui/commit/35d014628a69b0003799666895c2552b46ac7198), [`fa4510a`](https://github.com/assistant-ui/assistant-ui/commit/fa4510a3f3a23e0458ce8f3a397c352e3b0cde07), [`c9dd16c`](https://github.com/assistant-ui/assistant-ui/commit/c9dd16c4b1edc52f6a2529a9a07ebb7964aee9a1), [`dea8bc7`](https://github.com/assistant-ui/assistant-ui/commit/dea8bc7e122ad6ff53e48e6b0ffc6fcc2abaadd3), [`9c3d24d`](https://github.com/assistant-ui/assistant-ui/commit/9c3d24d8a358bcf5f683f85473b82524ea018930)]:
  - assistant-stream@0.3.14
  - @assistant-ui/core@0.2.1

## 0.14.0

### Minor Changes

- [#3970](https://github.com/assistant-ui/assistant-ui/pull/3970) [`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088) - chore: drop APIs deprecated in v0.11/v0.12 ([@Yonom](https://github.com/Yonom))

  See the [v0.14 migration guide](https://assistant-ui.com/docs/migrations/v0-14) for the full removal list and replacements.
  - `useAssistantApi` / `useAssistantState` / `useAssistantEvent` / `AssistantIf` removed (use `useAui` / `useAuiState` / `useAuiEvent` / `AuiIf`).
  - `getExternalStoreMessage` (singular) removed (use `getExternalStoreMessages`).
  - `MessageState.submittedFeedback` removed (use `message.metadata.submittedFeedback`).
  - `ThreadRuntime.startRun(parentId)` positional overload removed (pass `{ parentId }`).
  - `ThreadRuntime.unstable_loadExternalState` removed (use `importExternalState`).
  - `ThreadRuntime.unstable_resumeRun` removed (use `resumeRun`).
  - `ThreadRuntime.getModelConfig` removed (use `getModelContext`).
  - `AssistantRuntime.threadList` / `switchToNewThread` / `switchToThread` / `registerModelConfigProvider` / `reset` removed (use `threads` / `threads.switchToNewThread` / `threads.switchToThread` / `registerModelContextProvider` / `thread.reset`).
  - `ChatModelRunOptions.config` removed (use `context`).
  - `useLocalThreadRuntime` alias removed (use `useLocalRuntime`).
  - `unstable_useRemoteThreadListRuntime` / `unstable_useCloudThreadListAdapter` / `unstable_RemoteThreadListAdapter` / `unstable_InMemoryThreadListAdapter` aliases removed (drop the `unstable_` prefix).
  - `react-langgraph` `onSwitchToThread` removed (use `load`).
  - `toAISDKTools` / `getEnabledTools` removed (use `toToolsJSONSchema` from `assistant-stream`).

### Patch Changes

- Updated dependencies [[`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088)]:
  - @assistant-ui/core@0.2.0

## 0.13.0

### Minor Changes

- [#3908](https://github.com/assistant-ui/assistant-ui/pull/3908) [`d864d07`](https://github.com/assistant-ui/assistant-ui/commit/d864d0709d9db5f8e042e62cf1f40669f087ba68) - fix: robust top-turn anchoring with viewport-owned reserve ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

  **Migration:**
  - Remove `ThreadPrimitive.ViewportSlack` from your tree. It has been removed from the public API because top-anchor target registration is now handled automatically by `MessagePrimitive.Root` when `turnAnchor="top"`.
  - If you customized `fillClampThreshold` / `fillClampOffset` on `ThreadPrimitive.ViewportSlack` or `MessagePrimitive.Root`, replace them with `topAnchorMessageClamp` on `ThreadPrimitive.Viewport`:

  ```tsx
  // Before, either:
  <MessagePrimitive.Root fillClampThreshold="10em" fillClampOffset="6em" />

  // or:
  <ThreadPrimitive.ViewportSlack fillClampThreshold="10em" fillClampOffset="6em">
    ...
  </ThreadPrimitive.ViewportSlack>

  // After
  <ThreadPrimitive.Viewport
    turnAnchor="top"
    topAnchorMessageClamp={{ tallerThan: "10em", visibleHeight: "6em" }}
  >
    ...
  </ThreadPrimitive.Viewport>
  ```

### Patch Changes

- [#3924](https://github.com/assistant-ui/assistant-ui/pull/3924) [`801b9a6`](https://github.com/assistant-ui/assistant-ui/commit/801b9a68d9c7c70ab15ca53842d0df6adacb7b86) - fix(react): recover ComposerPrimitive.Input from dropped compositionend ([@nitnizzie](https://github.com/nitnizzie))

  reset `compositionRef` when the next change event reports `isComposing: false` so a dropped `compositionend` (chromium dead-key layouts, mid-composition focus loss) can no longer freeze the input. additionally call `setText` during composition so React 19's stricter controlled-input reconciliation does not reset the textarea mid-IME. fixes [#3923](https://github.com/assistant-ui/assistant-ui/issues/3923).

- [#3953](https://github.com/assistant-ui/assistant-ui/pull/3953) [`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6) - Add cursor-based pagination to the thread list. `RemoteThreadListAdapter.list()` accepts an optional `{ after }` cursor and may return `nextCursor` on the response. The runtime exposes `loadMore()`, `hasMore`, and `isLoadingMore` through both the legacy `ThreadListRuntime` API and the tap-only `aui.threads()` path; `ThreadListRuntimeCore.loadMore?()`, `hasMore?`, and `isLoadingMore?` are optional, so non-paginating cores (local, external-store, single-thread, in-memory) remain conformant. ([@okisdev](https://github.com/okisdev))

  `@assistant-ui/react` ships a matching `ThreadListPrimitive.LoadMore` button built on `createActionButton`, plus a `useThreadListLoadMore` primitive hook. Consumers wanting an `IntersectionObserver` sentinel can read `s.threads.hasMore` / `isLoadingMore` from `useAuiState` and call `aui.threads().loadMore()` directly.

  In-flight `loadMore()` calls dedup via a single promise. The existing `_loadGeneration` counter drops stale append callbacks when a `reload()` interleaves a `loadMore()`. The loadMore reducer captures the active adapter so a mid-flight adapter swap cannot leak a stale page. Empty-string `nextCursor` is normalised to `undefined`. `reload()` pre-clears the cursor so consumers reading `hasMore` directly during a reload do not observe a stale value.

  Adapter rejections are surfaced via `console.error` in both the initial-load and `loadMore` paths, matching the pattern in `RemoteThreadListHookInstanceManager` and `useToolInvocations`.

- [#3954](https://github.com/assistant-ui/assistant-ui/pull/3954) [`aa6e071`](https://github.com/assistant-ui/assistant-ui/commit/aa6e071fdd6ea832c5aff3f6cf817b2e3eb6ceb0) - fix: keep active top-anchored messages visible to layout ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3952](https://github.com/assistant-ui/assistant-ui/pull/3952) [`df7eb3e`](https://github.com/assistant-ui/assistant-ui/commit/df7eb3eee6beeac72d3220707cf4660adf932586) - perf: cut per-message overhead in long threads ([@okisdev](https://github.com/okisdev))

  Two `MessagePrimitive.Root` changes remove work that scaled with message count:
  - Defer the `parseCssLength` call inside the top-anchor target ref to the next animation frame. The synchronous `getComputedStyle` read previously forced a full-tree layout during the bulk-mount of a long thread (a 335 ms forced reflow at 100 messages in our trace). Deferring past first paint lets the browser do the layout naturally.
  - Split the root into a default and a top-anchor path. Threads using the default `turnAnchor="bottom"` no longer subscribe to the top-anchor `useAuiState` selectors per message.

  The only observable change is that top-anchor target registration is now async by one frame.

  Note: `@assistant-ui/ui` (private, copy-into-project) gains a `content-visibility: auto` default on message wrappers in the same PR. On a cold load with pre-existing history taller than the viewport, the placeholder-based `scrollHeight` can transiently disagree with the at-bottom check until off-screen messages are measured. `useOnResizeContent` resyncs within a frame, and the auto-scroll path uses an explicit "scrolling" flag rather than trusting `isAtBottom` alone, so run-start scrolling is unaffected.

- [#3948](https://github.com/assistant-ui/assistant-ui/pull/3948) [`f4a693e`](https://github.com/assistant-ui/assistant-ui/commit/f4a693ec1898f6ed0b81be47512fe51fd93a2de8) - fix(core): restore adapter context flow through RemoteThreadListAdapter.unstable_Provider ([@okisdev](https://github.com/okisdev))

  PR [#3891](https://github.com/assistant-ui/assistant-ui/issues/3891) hoisted the runtime binder out of `RemoteThreadListAdapter.unstable_Provider` so that user-supplied loading / Suspense wrappers no longer strand the runtime binding. as a side effect, any `RuntimeAdapterProvider` mounted inside `unstable_Provider` (history, attachments — what `useCloudThreadListAdapter` and `LocalStorageThreadListAdapter` both do) ended up below the binder in the render tree. `useRuntimeAdapters()` reads context from above, so the runtime hook saw `null` and `useExternalHistory` early-returned.

  for `useChatRuntime({ cloud })` setups this silently disabled message persistence (`POST /v1/threads/:id/messages`), thread history loading, run telemetry (`POST /v1/runs`), and forced cloud attachments to fall back to `vercelAttachmentAdapter`'s base64 inlining. the same regression hits `useA2ARuntime`, `useAgUiRuntime`, and `useLocalRuntime` whenever they are wrapped by `useRemoteThreadListRuntime` with a similar adapter.

  restore the pre-[#3891](https://github.com/assistant-ui/assistant-ui/issues/3891) layering: the binder once again renders inside `unstable_Provider`, so the runtime hook reads any context the Provider injects. the `ProviderRenderDetector` warning introduced by [#3891](https://github.com/assistant-ui/assistant-ui/issues/3891) is kept and now fires whenever Provider gates `children` behind suspense, loading state, or `useEffect` (the original [#3678](https://github.com/assistant-ui/assistant-ui/issues/3678) case), pointing the user at the synchronous-children rule. no API surface changes; first-party adapters keep working unchanged.

- Updated dependencies [[`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6), [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94), [`5fdf17e`](https://github.com/assistant-ui/assistant-ui/commit/5fdf17e019c91b000c6f4cf9e3e56c89d764a435)]:
  - @assistant-ui/core@0.1.18
  - assistant-stream@0.3.13
  - @assistant-ui/store@0.2.10
  - @assistant-ui/tap@0.5.11

## 0.12.28

### Patch Changes

- [#3853](https://github.com/assistant-ui/assistant-ui/pull/3853) [`6a919c1`](https://github.com/assistant-ui/assistant-ui/commit/6a919c1fa21113080f46dd0e08142c939dad3ea4) - feat: add `<MessagePrimitive.GroupedParts>` for hierarchical adjacent grouping of message parts ([@Yonom](https://github.com/Yonom))

  Introduces a new primitive that coalesces adjacent parts into groups via a user-supplied `groupBy(part) → "group-…" | readonly "group-…"[] | null`. Adjacent parts sharing a key-path prefix coalesce up to that prefix; ungrouped parts render as direct leaves.

  The render function takes `{ part, children }` and dispatches on a single `switch (part.type)`. `"group-…"` cases wrap `children` (the recursively-rendered subtree); real part types (`"text"`, `"tool-call"`, `"reasoning"`, …) render the part directly with the same `EnrichedPartState` enrichments (`toolUI`, `addResult`, `resume`, `dataRendererUI`) that `<MessagePrimitive.Parts>` provides.

  `GroupPart` is intentionally minimal: `{ type, status, indices }`. The render function is invoked once per group node and once per individual leaf part, so users never have to nest a `<MessagePrimitive.Parts>` call.

  The `groupBy` return type is constrained to `` `group-${string}` `` so the unified switch can never collide with a real part type. The component infers a literal `TKey` per call site, so `part.type` narrows to the exact union of group keys plus part types.

  For leaf parts, `children` is a sentinel that throws if rendered — accidental fall-through like `default: return children;` errors loudly instead of silently rendering nothing. Returning `null` from a leaf case is fine.

  Deprecates the legacy `components.ToolGroup`, `components.ReasoningGroup`, and `components.ChainOfThought` props on `<Parts>`, and `<MessagePrimitive.Unstable_PartsGrouped>` for adjacent grouping — all still work for backwards compatibility.

- Updated dependencies [[`0bbf5dd`](https://github.com/assistant-ui/assistant-ui/commit/0bbf5dd7357c0993958a2e8e55eb60705eca3207), [`98f165c`](https://github.com/assistant-ui/assistant-ui/commit/98f165ca83c4df9b9133eb4ce4fdf8c7a06886bb), [`62ec5bd`](https://github.com/assistant-ui/assistant-ui/commit/62ec5bd3368fb69ea7bcde275858e0ea8fa1d59b), [`6a919c1`](https://github.com/assistant-ui/assistant-ui/commit/6a919c1fa21113080f46dd0e08142c939dad3ea4)]:
  - @assistant-ui/core@0.1.17

## 0.12.27

### Patch Changes

- [#3909](https://github.com/assistant-ui/assistant-ui/pull/3909) [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`549037a`](https://github.com/assistant-ui/assistant-ui/commit/549037ac77aed8736823cfb82baf9645e3364adf), [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e), [`976aec5`](https://github.com/assistant-ui/assistant-ui/commit/976aec566330bee3c607cfb356f3358eefe28ac1), [`25b97d5`](https://github.com/assistant-ui/assistant-ui/commit/25b97d5c62fb038471b06eaa784ad4b7e23ef533), [`2008fc9`](https://github.com/assistant-ui/assistant-ui/commit/2008fc9af3d6fe05604d6b08275c2e9cec099bd9), [`88fcd35`](https://github.com/assistant-ui/assistant-ui/commit/88fcd352ecffd12f124abe988cc5499f784f81d6)]:
  - @assistant-ui/core@0.1.16
  - @assistant-ui/store@0.2.9
  - @assistant-ui/tap@0.5.10

## 0.12.26

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3873](https://github.com/assistant-ui/assistant-ui/pull/3873) [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a) - feat(core): add `reload()` method on `ThreadListRuntime` and `aui.threads()` that re-invokes the remote adapter's `list()` and refreshes the thread list. Use this after asynchronous auth (e.g. OIDC, better-auth) completes to recover from an initial load that ran before the authenticated user was available. A generation counter ensures a mid-flight response from a superseded load cannot overwrite a newer reload's state. ([@okisdev](https://github.com/okisdev))

- [#3829](https://github.com/assistant-ui/assistant-ui/pull/3829) [`9aa5410`](https://github.com/assistant-ui/assistant-ui/commit/9aa54107fc76509830309bb5e2c74984408b97fe) - fix: add render prop support to dropdown menu primitives ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#3583](https://github.com/assistant-ui/assistant-ui/pull/3583) [`a1f84ae`](https://github.com/assistant-ui/assistant-ui/commit/a1f84ae7b7782be19a25369905171de997f327ac) - fix: process dropped attachments in parallel ([@samdickson22](https://github.com/samdickson22))

  Align drag-and-drop attachment handling with paste so multiple files appear together instead of appearing one by one.

- [#3870](https://github.com/assistant-ui/assistant-ui/pull/3870) [`b4fde97`](https://github.com/assistant-ui/assistant-ui/commit/b4fde97355b51ed7a35401eeed0e5f5943a51150) - fix(composer): sync mouse hover with keyboard highlight in `TriggerPopover`. Items and categories now update `highlightedIndex` on mouse move, keeping `data-highlighted`, `aria-selected`, and `aria-activedescendant` consistent with the hovered element. A new `highlightIndex(index)` method is exposed on the popover scope. Closes [#3868](https://github.com/assistant-ui/assistant-ui/issues/3868). ([@okisdev](https://github.com/okisdev))

- [#3831](https://github.com/assistant-ui/assistant-ui/pull/3831) [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063) - chore: remove decorative separator comments across packages ([@okisdev](https://github.com/okisdev))

- [#3834](https://github.com/assistant-ui/assistant-ui/pull/3834) [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd) - refactor: unify mention/slash under behavior sub-primitives; delete Mention/SlashCommand aliases and the `execute` field on `Unstable_TriggerItem`; split TriggerPopoverResource; rename react-lexical `MentionNode`/`MentionPlugin`/`MentionChipProvider`/`mentionChip` prop to `DirectiveNode`/`DirectivePlugin`/`DirectiveChipProvider`/`directiveChip`; fix IME/Unicode/copy-paste/undo bugs. Breaking (`Unstable_` APIs): replace `onSelect={{type:"insertDirective",formatter}}` with `<Unstable_TriggerPopover.Directive formatter={...}>`; replace `onSelect={{type:"action",handler}}` with `<Unstable_TriggerPopover.Action onExecute={...}>`. Rename `unstable_useToolMentionAdapter` → `unstable_useMentionAdapter` with new `items`/`categories`/`includeModelContextTools` options. `unstable_useSlashCommandAdapter` now returns `{ adapter, action }` — `execute` stays in the hook closure instead of on the item. Rename CSS class `aui-mention-chip` → `aui-directive-chip` and attributes `data-mention-*` → `data-directive-*`. ([@okisdev](https://github.com/okisdev))

- [#3827](https://github.com/assistant-ui/assistant-ui/pull/3827) [`477fa8a`](https://github.com/assistant-ui/assistant-ui/commit/477fa8a4c94d8922f5639dac8888fc55926f36cd) - feat: unify mention and slash command primitives under `Unstable_TriggerPopover` ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e), [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836), [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a), [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c), [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568), [`055dda5`](https://github.com/assistant-ui/assistant-ui/commit/055dda54b68031d0c9c760bf89a7c1036dd2174d), [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063), [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c), [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd)]:
  - @assistant-ui/core@0.1.15
  - assistant-stream@0.3.12
  - assistant-cloud@0.1.27
  - @assistant-ui/store@0.2.8
  - @assistant-ui/tap@0.5.9

## 0.12.25

### Patch Changes

- c988db8: chore: update dependencies
- Updated dependencies [f20b9ca]
- Updated dependencies [c988db8]
  - @assistant-ui/core@0.1.14
  - assistant-stream@0.3.11
  - assistant-cloud@0.1.26
  - @assistant-ui/store@0.2.7
  - @assistant-ui/tap@0.5.8

## 0.12.24

### Patch Changes

- 42bc640: feat: support edit lineage and startRun in EditComposer send flow
  - Add `SendOptions` with `startRun` flag to `composer.send()`
  - Expose `parentId` and `sourceId` on `EditComposerState`
  - Add `EditComposerRuntimeCore` interface extending `ComposerRuntimeCore`
  - Bypass text-unchanged guard when `startRun` is explicitly set
  - `ComposerSendOptions` extends `SendOptions` for consistent layering

- e82726c: fix(react): forward viewport slack props from MessagePrimitive.Root
- 376bb00: chore: update dependencies
- 87e7761: feat: generalize mention system into trigger popover architecture with slash command support
  - Introduce `ComposerInputPlugin` protocol to decouple ComposerInput from mention-specific code
  - Extract generic `TriggerPopoverResource` from `MentionResource` supporting multiple trigger characters
  - Add `Unstable_TriggerItem`, `Unstable_TriggerCategory`, `Unstable_TriggerAdapter` generic types
  - Add `Unstable_SlashCommandAdapter`, `Unstable_SlashCommandItem` types
  - Add `ComposerPrimitive.Unstable_TriggerPopoverRoot` and related primitives
  - Add `ComposerPrimitive.Unstable_SlashCommandRoot` and related primitives
  - Add `unstable_useSlashCommandAdapter` hook for building slash command adapters
  - Refactor `MentionResource` as thin wrapper around `TriggerPopoverResource`
  - Alias `Unstable_MentionItem`/`Unstable_MentionAdapter` to generic trigger types
  - Update `react-lexical` `KeyboardPlugin` to use plugin protocol
  - All existing `Unstable_Mention*` APIs remain unchanged

- Updated dependencies [42bc640]
- Updated dependencies [376bb00]
- Updated dependencies [87e7761]
  - @assistant-ui/core@0.1.13
  - assistant-cloud@0.1.25
  - @assistant-ui/tap@0.5.7

## 0.12.23

### Patch Changes

- a8bf84b: feat(core): expose `getLoadThreadsPromise()` on `ThreadListRuntime` public API
- bdbd024: fix(core): set EMPTY_THREAD_CORE.isLoading to true to prevent Welcome page flash during thread switch
- 0958070: feat(core): add `initialThreadId` option to `useRemoteThreadListRuntime`
- Updated dependencies [de29641]
- Updated dependencies [a8bf84b]
- Updated dependencies [5fd5c3d]
- Updated dependencies [2c5cd97]
- Updated dependencies [ec50e8a]
  - @assistant-ui/core@0.1.11
  - assistant-stream@0.3.10

## 0.12.22

### Patch Changes

- 6554892: feat: add useAssistantContext for dynamic context injection

  Register a callback-based context provider that injects computed text into the system prompt at evaluation time, ensuring the prompt always reflects current application state.

- d726499: fix: unify assistant-transport request body format with AssistantChatTransport

  `callSettings` and `config` are now sent as nested objects in the request body,
  aligned with the AI SDK transport. The old top-level spread is preserved for
  backward compatibility but deprecated and will be removed in a future version.

- 876f75d: feat: add interactable state persistence

  Add persistence API to interactables with exportState/importState, debounced setPersistenceAdapter, per-id isPending/error tracking, flush() for immediate sync, and auto-flush on component unregister.

- bdce66f: chore: update dependencies
- c362685: feat: add RealtimeVoiceAdapter with VoiceOrb UI, mode/volume support, and ElevenLabs/LiveKit examples
- 4abb898: refactor: align interactables with codebase conventions
  - Rename `useInteractable` to `useAssistantInteractable` (registration only, returns id)
  - Add `useInteractableState` hook for reading/writing interactable state
  - Remove `makeInteractable` and related types
  - Rename `UseInteractableConfig` to `AssistantInteractableProps`
  - Extract `buildInteractableModelContext` from `Interactables` resource
  - Add `with-interactables` example to CLI

- 209ae81: chore: remove aui-source export condition from package.json exports
- 50b3100: feat: add render prop support to all primitives for shadcn "Base" component library compatibility
- af70d7f: feat: add useToolArgsStatus hook for per-prop streaming status

  Add a convenience hook that derives per-property streaming completion status from tool call args using structural partial JSON analysis.

- Updated dependencies [dffb6b4]
- Updated dependencies [6554892]
- Updated dependencies [9103282]
- Updated dependencies [876f75d]
- Updated dependencies [bdce66f]
- Updated dependencies [4abb898]
- Updated dependencies [209ae81]
- Updated dependencies [2dd0c9f]
- Updated dependencies [af70d7f]
  - assistant-stream@0.3.9
  - @assistant-ui/core@0.1.10
  - assistant-cloud@0.1.24
  - @assistant-ui/store@0.2.6
  - @assistant-ui/tap@0.5.6

## 0.12.21

### Patch Changes

- 3227e71: feat: add interactables with partial updates, multi-instance, and selection
  - `useInteractable(name, config)` hook and `makeInteractable` factory for registering AI-controllable UI
  - `Interactables()` scope resource with auto-generated update tools and system prompt injection
  - Partial updates — auto-generated tools use partial schemas so AI only sends changed fields
  - Multi-instance support — same name with different IDs get separate `update_{name}_{id}` tools
  - Selection — `setSelected(true)` marks an interactable as focused, surfaced as `(SELECTED)` in system prompt

- 52403c3: chore: update dependencies
- Updated dependencies [781f28d]
- Updated dependencies [3227e71]
- Updated dependencies [3227e71]
- Updated dependencies [0f55ce8]
- Updated dependencies [83a15f7]
- Updated dependencies [52403c3]
- Updated dependencies [ffa3a0f]
  - @assistant-ui/core@0.1.9
  - assistant-stream@0.3.8
  - assistant-cloud@0.1.23
  - @assistant-ui/store@0.2.5
  - @assistant-ui/tap@0.5.5

## 0.12.20

### Patch Changes

- 28a987a: feat: SingleThreadList resource
  refactor: attachTransformScopes should mutate the scopes instead of cloning it
- 736344c: chore: update dependencies
- ff3be2a: Add @-mention system with cursor-aware trigger detection, keyboard navigation, search, and Lexical rich editor support
- 70b19f3: feat: add queue.clear callback, route thread.append through queue
  - Add `clear(reason: "edit" | "reload" | "cancel-run")` to `ExternalThreadQueueAdapter`
  - `thread.append()` now routes through `queue.enqueue` when a queue adapter is present
  - Cancel, edit, and reload operations call `queue.clear` with the appropriate reason

- 70b19f3: feat: add native queue and steer support
  - Add `queue` adapter to `ExternalThreadProps` for runtimes that support message queuing
  - Add `QueueItemPrimitive.Text`, `.Steer`, `.Remove` primitives for rendering queue items
  - Add `ComposerPrimitive.Queue` for rendering the queue list within the composer
  - Add `ComposerSendOptions` with `steer` flag to `composer.send()`
  - Add `capabilities.queue` to `RuntimeCapabilities`
  - `ComposerPrimitive.Send` stays enabled during runs when queue is supported
  - Cmd/Ctrl+Shift+Enter hotkey sends with `steer: true` (interrupt current run)
  - Add `queueItem` scope to `ScopeRegistry`
  - Add `queue` field to `ComposerState` and `queueItem()` method to `ComposerMethods`

- c71cb58: chore: update dependencies
- Updated dependencies [1406aed]
- Updated dependencies [9480f30]
- Updated dependencies [28a987a]
- Updated dependencies [736344c]
- Updated dependencies [ff3be2a]
- Updated dependencies [70b19f3]
- Updated dependencies [c71cb58]
  - @assistant-ui/core@0.1.8
  - @assistant-ui/store@0.2.4
  - assistant-stream@0.3.7
  - @assistant-ui/tap@0.5.4

## 0.12.19

### Patch Changes

- 7ecc497: feat: children API for primitives with part.toolUI, part.dataRendererUI, and MessagePrimitive.Quote
- Updated dependencies [7ecc497]
  - @assistant-ui/core@0.1.7

## 0.12.18

### Patch Changes

- 1ed9867: feat: move resumeRun to stable
- 427ffaa: refactor: useRemoteThreadListRuntime no longer marked unstable
- 349f3c7: chore: update deps
- 02614aa: feat: add multi-agent support
  - `ReadonlyThreadProvider` and `MessagePartPrimitive.Messages` for rendering sub-agent messages
  - `assistant-stream`: add `messages` field to `tool-result` chunks, `ToolResponseLike`, and `ToolCallPart` types, enabling sub-agent messages to flow through the streaming protocol

- 642bcda: Add `quote.tsx` registry components and `injectQuoteContext` helper
- Updated dependencies [1ed9867]
- Updated dependencies [427ffaa]
- Updated dependencies [349f3c7]
- Updated dependencies [02614aa]
- Updated dependencies [6cc4122]
- Updated dependencies [642bcda]
  - @assistant-ui/core@0.1.6
  - assistant-stream@0.3.6
  - assistant-cloud@0.1.22
  - @assistant-ui/store@0.2.3
  - @assistant-ui/tap@0.5.3

## 0.12.17

### Patch Changes

- 990e41d: refactor: code sharing between the multiple platforms
- Updated dependencies [990e41d]
  - @assistant-ui/core@0.1.5

## 0.12.16

### Patch Changes

- 5ae74fe: fix: prevent double-submit when ComposerPrimitive.Send child has type="submit"
- 8ed9d6f: Refactor React Native component API: move shared runtime logic (remote thread list, external store, cloud adapters, message converter, tool invocations) into @assistant-ui/core for reuse across React and React Native
- Updated dependencies [5ae74fe]
- Updated dependencies [8ed9d6f]
- Updated dependencies [01bee2b]
  - @assistant-ui/core@0.1.3

## 0.12.15

### Patch Changes

- 07dcce0: fix(react): duplicate `toolCallId` parts when joining consecutive assistant snapshots in the external message converter.
- a845911: chore: update dependencies
- bc40eaf: fix(react): `ActionBarMorePrimitive` disappearing when `ActionBarPrimitive.Root` uses `autohide="not-last"` on non-last messages.
- be23d74: fix(react): make `useToolInvocations` args stream rewrites recover safely and avoid premature closure for non-executable client tools.
- 1eb059c: fix(react): avoid crashing when external message conversion receives orphaned tool results without a matching tool call.
- Updated dependencies [a845911]
  - assistant-cloud@0.1.21
  - @assistant-ui/store@0.2.2
  - @assistant-ui/tap@0.5.2

## 0.12.14

### Patch Changes

- 03714af: fix: DataRenderers not in scope
- Updated dependencies [03714af]
  - @assistant-ui/core@0.1.2

## 0.12.13

### Patch Changes

- 17cf9a8: feat(telemetry): add reasoning/cached token usage across cloud reporting paths
- Updated dependencies [17cf9a8]
  - assistant-cloud@0.1.20

## 0.12.12

### Patch Changes

- 36ef3a2: chore: update dependencies
- 6692226: feat: support external source attachments in composer

  `addAttachment()` now accepts either a `File` or a `CreateAttachment` descriptor, allowing users to add attachments from external sources (URLs, API data, CMS references) without creating dummy `File` objects or requiring an `AttachmentAdapter`.

- c31c0fa: Extract shared React code (model-context, client, types, providers, RuntimeAdapter) into `@assistant-ui/core/react` sub-path so both `@assistant-ui/react` and `@assistant-ui/react-native` re-export from one source.
- 1672be8: feat: bindExternalStoreMessage
- 28f39fe: Handle unknown attachment types with fallback component and unknown message part types with `console.warn` instead of throwing
- 3a1cb66: feat: assistant transport prepareRequestBody support
- 14769af: refactor: move RuntimeAdapter base logic to @assistant-ui/core; re-export missing core APIs from distribution packages
- 7c360ce: Update npm README
- a638f05: refactor(react): target @assistant-ui/store for ScopeRegistry module augmentation
- 8a78cd2: fix: stabilize runtimeHook identity in useRemoteThreadListRuntime to avoid unnecessary option updates and thread state churn
- Updated dependencies [a638f05]
- Updated dependencies [28f39fe]
- Updated dependencies [36ef3a2]
- Updated dependencies [6692226]
- Updated dependencies [c31c0fa]
- Updated dependencies [fc98475]
- Updated dependencies [374f83a]
- Updated dependencies [fc98475]
- Updated dependencies [1672be8]
- Updated dependencies [14769af]
- Updated dependencies [a638f05]
  - @assistant-ui/core@0.1.1
  - assistant-stream@0.3.4
  - assistant-cloud@0.1.19
  - @assistant-ui/store@0.2.1
  - @assistant-ui/tap@0.5.1

## 0.12.11

### Patch Changes

- 5bbe8a9: Fix rewritten streaming tool arguments in assistant transport by safely restarting tool-call arg streams without crashing, preserving logical tool call IDs, and preventing stale status cleanup after reset.
- 5e304ea: feat: client-side run telemetry reporting with `beforeReport` hook
- 546c053: feat(core): extract subscribable, utils, and model-context; add public/internal API split
- a7039e3: feat(core): extract remote-thread-list and assistant-transport utilities to @assistant-ui/core
- 16c10fd: feat(core): extract runtime and adapters to @assistant-ui/core
- 98c3d54: feat(react): support custom components for "data" message parts
- b181803: feat(core): introduce @assistant-ui/core package

  Extract framework-agnostic core from @assistant-ui/react. Replace React ComponentType references with framework-agnostic types and decouple AssistantToolProps/AssistantInstructionsConfig from React hook files.

- 7836760: fix(assistant-cloud): expand joined messages for AI SDK v6 history export and telemetry reporting
- 9276547: fix: thread deletion crash "Entry not available in the store"
- b65428e: refactor: thread().composer() now needs to be invoked
- af5b085: feat(assistant-cloud): support MCP tool observability
- 61b54e9: Add message timing metadata: `AssistantMessageTiming` type, automatic timing tracking in `AssistantMessageAccumulator`, `MessageTiming` type, `useMessageTiming()` hook, and client-side streaming timing for AI SDK runtime.
- a094c45: fix: add DataMessagePart to ThreadUserMessagePart for parity with ThreadAssistantMessagePart
- 4d7f712: feat(core): move runtime-to-client bridge to core/store for framework reuse
- ecc29ec: feat(core): move scope types and client implementations to @assistant-ui/core/store
- 6e97999: feat(core): move store tap infrastructure to @assistant-ui/core/store
- a247fc9: feat(assistant-cloud): allow save complete multi-step message
- f414af9: fix: avoid stale thread metadata overwrite while streaming generated titles
- b48912c: fix(react): smooth streaming behaviour to include first chunk
- 93910bd: Rename .tsx files to .ts where no JSX syntax is used
- 58a8472: feat: Add standalone AI SDK hooks for cloud persistence without assistant-ui

  New `@assistant-ui/cloud-ai-sdk` package with `useCloudChat` and `useThreads` hooks. Wraps AI SDK's `useChat` with automatic message persistence, thread management, and auto-title generation.

- Updated dependencies [b65428e]
- Updated dependencies [d08a488]
- Updated dependencies [b65428e]
- Updated dependencies [5e304ea]
- Updated dependencies [546c053]
- Updated dependencies [a7039e3]
- Updated dependencies [16c10fd]
- Updated dependencies [40a67b6]
- Updated dependencies [b65428e]
- Updated dependencies [b181803]
- Updated dependencies [b65428e]
- Updated dependencies [6bd6419]
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
- Updated dependencies [af5b085]
- Updated dependencies [61b54e9]
- Updated dependencies [4d7f712]
- Updated dependencies [ecc29ec]
- Updated dependencies [6e97999]
- Updated dependencies [a247fc9]
- Updated dependencies [b65428e]
- Updated dependencies [93910bd]
- Updated dependencies [60bbe53]
- Updated dependencies [58a8472]
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
  - @assistant-ui/tap@0.5.0
  - assistant-cloud@0.1.18
  - @assistant-ui/store@0.2.0
  - @assistant-ui/core@0.1.0
  - assistant-stream@0.3.3

## 0.12.10

### Patch Changes

- afaaf3b: fix: use bracket notation for process.env
- afaaf3b: fix: duplicate key toolCallId error in HITL tools (#3197)
- afaaf3b: fix(react): runConfig not applied when clicking Suggestion with send=true
- afaaf3b: feat(react): Quote Selected Text primitives

  Added new primitives and hooks for quoting selected text from messages:
  - `SelectionToolbarPrimitive.Root` - Floating toolbar that appears on text selection within a message
  - `SelectionToolbarPrimitive.Quote` - Button inside the floating toolbar to capture the selection as a quote
  - `ComposerPrimitive.Quote` - Container for quote preview (renders only when quote is set)
  - `ComposerPrimitive.QuoteText` - Displays the quoted text
  - `ComposerPrimitive.QuoteDismiss` - Button to clear the quote
  - `useMessageQuote()` - Hook to read quote info from message metadata
  - `QuoteInfo` type - `{ text: string; messageId: string }`
  - `ComposerRuntime.setQuote()` - Programmatic API to set/clear quotes
  - `MessagePrimitive.Root` now renders `data-message-id` attribute

- 51d24be: feat(react): add submitMode prop

  Add submitMode prop to ComposerInput with three options: "enter" (default), "ctrlEnter", and "none". This controls keyboard submission behavior - "ctrlEnter" mode allows plain Enter to insert newlines for easier multi-line message composition, "none" disables keyboard submission entirely.

  The existing submitOnEnter prop is now deprecated but still supported for backward compatibility.

- afaaf3b: feat(assistant-transport): support editing messages
- Updated dependencies [afaaf3b]
  - @assistant-ui/tap@0.4.6

## 0.12.9

### Patch Changes

- a088518: chore: update dependencies
- d8122cc: feat: ChainOfThought Layout API
- Updated dependencies [a088518]
  - assistant-stream@0.3.2
  - assistant-cloud@0.1.17
  - @assistant-ui/store@0.1.6
  - @assistant-ui/tap@0.4.5

## 0.12.8

### Patch Changes

- 38f4a32: feat: ChainOfThoughtPrimitive

## 0.12.7

### Patch Changes

- 77af8c3: fix: runtime not responsive if loaded under React StrictMode (critial bug)
- 9ef966a: fix(store): memoize the aui client instance
- Updated dependencies [77af8c3]
- Updated dependencies [9ef966a]
  - @assistant-ui/tap@0.4.4
  - @assistant-ui/store@0.1.5

## 0.12.6

### Patch Changes

- 39fefec: feat: importExternalState API

## 0.12.5

### Patch Changes

- d45b893: chore: update dependencies
- fe71bfc: feat: use enhanced tapSubscribableResource hook
- Updated dependencies [d45b893]
- Updated dependencies [fe71bfc]
- Updated dependencies [fe71bfc]
  - assistant-stream@0.3.1
  - assistant-cloud@0.1.16
  - @assistant-ui/store@0.1.4
  - @assistant-ui/tap@0.4.3

## 0.12.4

### Patch Changes

- 86baaee: fix(react): devtools not register
- 3bbe318: fix: allow destructuring proxy methods (e.g. `addToolResult`, `resumeToolCall`)
- Updated dependencies [3bbe318]
  - @assistant-ui/store@0.1.3

## 0.12.3

### Patch Changes

- 07d1c65: fix: nesting assistant providers
- b591d72: feat: new tools API
- 59a338a: feat: åshowEmptyOnNonTextEnd
- acbaf07: feat: add framework-agnostic `toToolsJSONSchema` and `toGenericMessages` utilities to `assistant-stream`
- c665612: fix: do not capture handleSendMessage errors
- 0371d72: feat: AssistantRuntimeProvider aui prop
- e8b3f34: feat: Suggestions API and Primitives
- Updated dependencies [07d1c65]
- Updated dependencies [acbaf07]
- Updated dependencies [5ab3690]
- Updated dependencies [0371d72]
  - @assistant-ui/store@0.1.2
  - assistant-stream@0.3.0
  - @assistant-ui/tap@0.4.2
  - assistant-cloud@0.1.15

## 0.12.2

### Patch Changes

- 1ea3e28: feat(react): better error handling
- 8cbf686: fix: tap should run effects after remount
- a8be364: feat: log individual errors when throwing AggregateError
- 605d825: chore: update dependencies
- Updated dependencies [8cbf686]
- Updated dependencies [2e088eb]
- Updated dependencies [a8be364]
- Updated dependencies [605d825]
- Updated dependencies [fe15232]
  - @assistant-ui/tap@0.4.1
  - @assistant-ui/store@0.1.1
  - assistant-stream@0.2.48
  - assistant-cloud@0.1.14

## 0.12.1

### Patch Changes

- 8672695: fix: race condition in RemoteThreadListRuntime causing app crash on thread deletion

## 0.12.0

### Minor Changes

- 9314b36: feat: use @assistant-ui/store to power state management

# Patch Changes

- 6eab31e: fix(react): handle tool argsText key reordering during streaming
- 083ed83: fix(cloud): serialize image and file parts across all formats
- 6511990: fix(react): bind `this` context when calling `__internal_setGetInitializePromise`
- a526e63: fix uncaught AbortError when cancelling streams
- Updated dependencies [11625b5]
  - @assistant-ui/store@0.0.7

## 0.11.59

### Patch Changes

- fe06c7c: Revert "fix(react): accept URL-based images in sanitizeImageContent (#3069)"
- Updated dependencies
  - @assistant-ui/tap@0.4.0

## 0.11.58

### Patch Changes

- 3719567: chore: update deps
- Updated dependencies [3719567]
  - assistant-stream@0.2.47
  - assistant-cloud@0.1.13
  - @assistant-ui/tap@0.3.6

## 0.11.57

### Patch Changes

- 9a110ea: fix(react): prevent viewport slack feedback loop
- caee095: feat(react): allow passing threadId to backend
- 9883125: fix(react): merge reasoning parts with same parentId in ExternalStoreRuntime

## 0.11.56

### Patch Changes

- 3a0b9c8: fix(react): scroll to bottom on initial history load
- b8f62e1: fix: add missing type export for `ExportedMessageRespositoryItem`
- 8d5c20c: fix: restore `useLocalThreadRuntime` export as deprecated alias to `useLocalRuntime`

## 0.11.55

### Patch Changes

- 5ca09bc: fix(cloud): filter unsupported messages parts passed to `generateTitle`

## 0.11.54

### Patch Changes

- ab2259d: feat(react): thread list item more primitive
- 699e585: feat(react): action bar more primitive
- 4b63488: Allow async function for `body` in runtime options
- aee8561: feat(react): add dictation (speech-to-text) support

  Adds dictation (speech-to-text) support via a new `DictationAdapter` interface. Users can now convert voice input to text in the composer using the browser's Web Speech API or custom adapters.
  - New adapter: `WebSpeechDictationAdapter` - uses browser's Web Speech API
  - New components: `ComposerPrimitive.Dictate`, `ComposerPrimitive.StopDictation`, `ComposerPrimitive.DictationTranscript`
  - New state: `composer.dictation` for dictation status and transcript
  - New methods: `composer.startDictation()`, `composer.stopDictation()`
  - Configuration via `adapters.dictation` in runtime options

- dbfdb11: fix(docs): fix broken migration links

## 0.11.53

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages
- Updated dependencies [57bd207]
- Updated dependencies [cce009d]
  - assistant-stream@0.2.46
  - assistant-cloud@0.1.12
  - @assistant-ui/tap@0.3.5

## 0.11.52

### Patch Changes

- 4db92c9: fix(react): useIsHoveringRef on SSR issue

## 0.11.51

### Patch Changes

- fix: update tap package

## 0.11.50

### Patch Changes

- bae3aa2: feat: use new tap global flushSync method
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
  - assistant-stream@0.2.45
  - assistant-cloud@0.1.11

## 0.11.49

### Patch Changes

- 89aec17: feat: AI SDK frontend tool execution cancellation support
  fix: AI SDK isRunning status when running frontend tools
- ee7040f: fix: always scroll to bottom when switching to a thread
- bd27465: feat: ability to disable auto scrollToBottom on message send / thread switch
- a3e9549: feat: only add turn anchor slack after the first turn
- 206616b: fix: scroll to bottom button flickers on send message
- 7aa77b5: feat: do not take viewport padding into account when calculating the slack inset
- Updated dependencies [89aec17]
  - assistant-stream@0.2.44

## 0.11.48

### Patch Changes

- ba26b22: feat(react): export as anything
- d169e4f: feat: add AssistantIf
- da9f8a6: Fix ESC keydown handler to only trigger when event originates from the composer input

  The `useEscapeKeydown` hook was intercepting ESC key events globally, preventing other UI elements (like Radix dialogs) from responding to ESC. The handler now checks if the event target is within the composer input before calling `preventDefault()`.

- 01c31fe: chore: update dependencies
- Updated dependencies [01c31fe]
  - assistant-stream@0.2.43
  - assistant-cloud@0.1.10
  - @assistant-ui/tap@0.3.2

## 0.11.47

### Patch Changes

- 45d771f: fix(react): data-status stuck on running when smooth streaming disabled

## 0.11.46

### Patch Changes

- ab8953b: feat(react): add `allowNesting` option to allow wrapping runtimes with custom thread list adapters

## 0.11.45

### Patch Changes

- ec662cd: chore: update dependencies
- Updated dependencies [ec662cd]
  - assistant-stream@0.2.42
  - assistant-cloud@0.1.9
  - @assistant-ui/tap@0.3.1

## 0.11.44

### Patch Changes

- 4f6afef: feat: unified json schema

## 0.11.43

### Patch Changes

- f54c17b: feat: Viewport turnAnchor="top"

## 0.11.42

### Patch Changes

- 354c5c3: feat: MessageState.index
- c3ac004: fix: export `ComposerAttachmentDropzone` as `ComposerPrimitive.AttachmentDropzone`
  fix: prevent drag state flicker in `ComposerAttachmentDropzone`
- 282a596: feat: ThreadPrimitive.ScrollToBottom behavior prop

## 0.11.41

### Patch Changes

- 08430e8: feat(assistant-transport): support command enqueue inside onError/onCancel
  feat(assistant-transport): cancel queued commands on error

## 0.11.40

### Patch Changes

- 2c33091: chore: update deps
- Updated dependencies [2c33091]
  - assistant-stream@0.2.41
  - assistant-cloud@0.1.8
  - @assistant-ui/tap@0.2.2

## 0.11.39

### Patch Changes

- b408005: feat(react-ai-sdk): Integrate AI SDK v5 data parts in message content
- 7a6d9ca: fix: LocalThreadRuntime deleting branches during message reloads
- 70d5966: feat: allow storing runConfig with ThreadHistoryAdapter
- 3754bdd: refactor: rename toolUIs to tools and remove ToolUI API
- 0a4bdc1: feat: renamed `ResourceElementConstructor` to `Resource`, changed `ResourceElement.type` to be `Resource` instead of `ResourceFn`
- Updated dependencies [0a4bdc1]
  - @assistant-ui/tap@0.2.1

## 0.11.38

### Patch Changes

- 66a13a0: fix: separate scroll-to-bottom button from autoScroll behavior (#1916)
- 4e3877e: feat: Add thread fetching capability to remote thread list adapter
  - Add `fetch` method to `RemoteThreadListAdapter` interface
  - Implement `fetch` in cloud adapter to retrieve individual threads
  - Enhance `switchToThread` to automatically fetch and load threads not present in the current list
  - Add `get` method to `AssistantCloudThreads` for individual thread retrieval

- eef682b: fix(react): update check for scroll position in autoscroll
- Updated dependencies [4e3877e]
  - assistant-cloud@0.1.7

## 0.11.37

### Patch Changes

- 0ce129b: add scroll lock hook for reasoning component

## 0.11.36

### Patch Changes

- 3ab9484: feat: Toolkit API
- 7a88ead: chore: mark all old context API hooks as deprecated
- 81b581f: feat: display AI SDK errors
- 2fc7e99: chore: update deps
- Updated dependencies [dbc4ec7]
- Updated dependencies [2fc7e99]
  - @assistant-ui/tap@0.1.5
  - assistant-stream@0.2.39
  - assistant-cloud@0.1.6

## 0.11.35

### Patch Changes

- 2fc5c3d: feat: AssistantTransport wire format
- 04144dd: feat: useAssistantTransportState
- Updated dependencies [2fc5c3d]
  - assistant-stream@0.2.38

## 0.11.34

### Patch Changes

- 953db24: chore: update deps
- fix: submittedFeedback external message converter support
- Updated dependencies [953db24]
  - assistant-stream@0.2.37
  - assistant-cloud@0.1.5
  - @assistant-ui/tap@0.1.4

## 0.11.33

### Patch Changes

- refactor: move submittedFeedback to metadata, add ThreadMessageLike support

## 0.11.32

### Patch Changes

- fix: Cannot enqueue a chunk into a readable stream that is closed or has been requested to be closed

## 0.11.31

### Patch Changes

- chore: update deps
- Updated dependencies
  - assistant-stream@0.2.36
  - assistant-cloud@0.1.4
  - @assistant-ui/tap@0.1.3

## 0.11.30

### Patch Changes

- feat: add submittedFeedback ThreadAssistantMessage

## 0.11.29

### Patch Changes

- 92dfb0f: fix: update and maintain message levels on reparent

## 0.11.28

### Patch Changes

- fix: useExternalMessageConverter Tool subagent messages support

## 0.11.27

### Patch Changes

- e6a46e4: chore: update deps
- Updated dependencies [e6a46e4]
  - assistant-stream@0.2.34
  - assistant-cloud@0.1.3
  - @assistant-ui/tap@0.1.2

## 0.11.26

### Patch Changes

- feat: Add support for nested tool calls in assistant transport. Tool calls can now include a `messages` field containing nested `ThreadMessage[]`, enabling subagent tool calls to be automatically invoked by `useToolInvocations`.

## 0.11.25

### Patch Changes

- feat: ToolCallMessagePart.messages for subagent messages

## 0.11.24

### Patch Changes

- 4a1e4cf: Deprecate `autoSend` and `method` in favor of `send` and `clearComposer`

  ```tsx
  <ThreadPrimitive.Suggestion
    prompt="Tell me about React hooks"
    send // same as autoSend=true
    clearComposer // same as method="replace", defaults to true
  />
  ```

  When `send` and `clearComposer` are `false`, the suggestion is appended to existing user input

## 0.11.23

### Patch Changes

- 3caad00: refactor: rename interrupt -> human for tool input handling
- Updated dependencies [3caad00]
  - assistant-stream@0.2.33

## 0.11.22

### Patch Changes

- e8d6d7b: feat: revamp Assistant augmentation mechanism
- e81784b: feat: Tool Call interrupt() resume() API
- Updated dependencies [e81784b]
  - assistant-stream@0.2.32

## 0.11.21

### Patch Changes

- 7a020fa: fix: disallow branch switching during runs for most runtimes
- 7a020fa: feat: Add switchBranchDuringRun capability flag to control branch switching while running
- c5188d9: feat: revamp langgraph thread management integration

## 0.11.20

### Patch Changes

- 94fcc39: feat: Add custom commands support to useAssistantTransportRuntime

  Adds the ability to send custom commands through useAssistantTransportRuntime by:
  - Introducing a global augmentation pattern via `Assistant.Commands` interface
  - Adding `useAssistantTransportSendCommand` hook for sending custom commands
  - Supporting custom command types in the transport layer

  Users can now extend the Assistant interface to define their own command types:

  ```typescript
  declare global {
    interface Assistant {
      Commands: {
        myCommand: { type: "my-command"; data: string };
      };
    }
  }
  ```

## 0.11.19

### Patch Changes

- 2c6198a: fix: thread empty should return false while thread is loading
  fix: devtools hydration warning

## 0.11.18

### Patch Changes

- 057cdc7: fix: notify when suggestions change

## 0.11.17

### Patch Changes

- 2bbe604: feat: createMssageConverter toThreadMessages isRunning support

## 0.11.16

### Patch Changes

- cc9945b: feat: MessageProvider API

## 0.11.15

### Patch Changes

- d19ebab: feat(assistant-transport): surface stream errors to caller
- Updated dependencies [d19ebab]
  - assistant-stream@0.2.29

## 0.11.14

### Patch Changes

- feat: throttle only on stream resume
- Updated dependencies
  - assistant-stream@0.2.28

## 0.11.13

### Patch Changes

- 3ce485f: feat: add cancel handling and extend message types

## 0.11.12

### Patch Changes

- c4830cc: feat: assistant transport allow passing state in converter

## 0.11.11

### Patch Changes

- fix: make accumulator throttling smoother
- Updated dependencies
  - assistant-stream@0.2.27

## 0.11.10

### Patch Changes

- 367996e: fix: subscribe to scope identity changes

## 0.11.9

### Patch Changes

- 6c36e21: fix: react 18 compatibility for AssistantProvider API

## 0.11.8

### Patch Changes

- 0f21c70: feat: Attachment support for useAssistantTransportRuntime
- Updated dependencies [0f21c70]
  - assistant-stream@0.2.26

## 0.11.7

### Patch Changes

- 8f6fb59: feat: useAssistantTransportRuntime (experimental)
- d318c83: fix: ThreadMessageLike should prefer argsText if provided over json stringifying args

## 0.11.6

### Patch Changes

- 5cdfc9c: fix: TextContentPartProvider not updating when passed text changes

## 0.11.5

### Patch Changes

- 161db8b: fix: newThreadId should be null instead of undefined when empty
- 161db8b: fix: composer.add-attachment should only fire once
- 161db8b: feat: add wildcard event support to EventManager
  - Added support for wildcard "\*" event subscriptions to listen to all events
  - Wildcard listeners receive events in format: `{ event: string, payload: any }`
  - Updated type definitions to include "\*" as a valid event type
  - Modified emit method to trigger both specific and wildcard listeners

## 0.11.4

### Patch Changes

- effd817: fix: race condition in remote threadlist runtime

## 0.11.3

### Patch Changes

- 2e1815e: feat: select attachment by id

## 0.11.2

### Patch Changes

- 2d46069: chore: drop deprecated renamed fields

## 0.11.1

### Patch Changes

- 986b1c0: fix: attachments should not cause infinite rerenders
- 0534bc5: refactor: reorganize runtime files to prepare for part 2 of runtime rearchitecture
- Updated dependencies [0534bc5]
  - @assistant-ui/tap@0.1.1

## 0.11.0

### Minor Changes

- 5437dbe: feat: runtime rearchitecture (unified state API)

### Patch Changes

- 39ac2f3: feat: AI SDK v5 import support
- Updated dependencies [5437dbe]
  - @assistant-ui/tap@0.1.0

## 0.10.50

### Patch Changes

- 3498c99: feat: assistant cloud attachments support

## 0.10.49

### Patch Changes

- af2666a: fix: AssistantCloudThreadHistoryAdapter should be stateless

## 0.10.48

### Patch Changes

- ad53f5f: fix: ComposerInput does not auto focus on thread switch when using ExternalStoreRuntime

## 0.10.47

### Patch Changes

- 1f2ad24: fix: reset assistantOptimisticId on import
- 1f2ad24: fix: drop resetScheduled mechanism

## 0.10.46

### Patch Changes

- 25104d0: feat: MessageRepository should delete dangling messages on resetHead

## 0.10.45

### Patch Changes

- e242a06: feat: AssistantFrameHost, AssistantFrameProvider APIs
- e242a06: feat: ModelContextRegistry API

## 0.10.44

### Patch Changes

- 13684d5: feat: useExternalStoreRuntime improved reset handling

## 0.10.43

### Patch Changes

- a80dcff: feat: Add \*ByIndex primitives for direct indexed access

  Added new primitives that allow rendering individual items by index, improving performance and enabling more granular control:
  - `ThreadPrimitive.MessageByIndex` - Render a specific message by index
  - `MessagePrimitive.PartByIndex` - Render a specific message part by index
  - `MessagePrimitive.AttachmentByIndex` - Render a specific message attachment by index
  - `ComposerPrimitive.AttachmentByIndex` - Render a specific composer attachment by index
  - `ThreadListPrimitive.ItemByIndex` - Render a specific thread list item by index

  These primitives provide direct access to individual items without iterating through entire collections, and are now used internally by their parent components (Messages, Parts, Attachments, Items) for improved efficiency.

## 0.10.42

### Patch Changes

- 12e0a77: chore: update deps
- Updated dependencies [12e0a77]
  - assistant-stream@0.2.23
  - assistant-cloud@0.1.1

## 0.10.41

### Patch Changes

- eda5558: feat: AI SDK custom UIMessage type support

## 0.10.40

### Patch Changes

- 179f8b7: Add format parameter support to assistant-cloud client library
  - Add optional `format` query parameter to `AssistantCloudThreadMessages.list()` method
  - Update cloud history adapter to pass format parameter when loading messages
  - Enables backend-level message format conversion when supported by the cloud backend

- Updated dependencies [179f8b7]
  - assistant-cloud@0.1.0

## 0.10.39

### Patch Changes

- a4389da: feat: AI SDK v5 assistant-cloud thread history support

## 0.10.38

### Patch Changes

- 979ee67: feat: assistant cloud support for AI SDK v5

## 0.10.37

### Patch Changes

- f32b6a4: fix: new thread functionality no longer working with new threadlistruntime

## 0.10.36

### Patch Changes

- ed78407: Modified the `detach` and `cancelRun` methods to create a standardized `Error` object with a JSON-encoded message and a name of `"AbortError"`, improving consistency in how abort reasons are passed and processed.
- 77ce337: Fix polymorphic ref type error in `ComposerInput`
- f59959e: fix: add image message part support and sanitize function

## 0.10.35

### Patch Changes

- fix: threadListItemRuntime Method not implemented
- feat: support zod v4

## 0.10.34

### Patch Changes

- 0f063e0: chore: update dependencies
- 5d8b074: feat: MessagePrimitive.PartsGrouedp
- Updated dependencies [0f063e0]
  - assistant-stream@0.2.22
  - assistant-cloud@0.0.4

## 0.10.33

### Patch Changes

- fix: error on mount of local runtime

## 0.10.32

### Patch Changes

- fix: race condition in generateTitle when a newly running thread is detached

## 0.10.31

### Patch Changes

- fix: maintain chronological order for parts without parentId in PartsGroupedByParentId

## 0.10.30

### Patch Changes

- fix: race condition in RunController when using parentIds
- 3fb37f9: Fix internal dependency cycles
- Updated dependencies
  - assistant-stream@0.2.21

## 0.10.29

### Patch Changes

- 1f2fb01: fix: message id not found when using messageRepository in external store

## 0.10.28

### Patch Changes

- e92f7cc: feat: ExternalStoreAdapter.messageRepository API
- c823efe: feat: add `runtime.thread.reset()` method for clearing thread

## 0.10.27

### Patch Changes

- f23fdb6: feat: add parent ID grouping for message parts
- Updated dependencies [f23fdb6]
  - assistant-stream@0.2.20

## 0.10.26

### Patch Changes

- e359ffc: Fix circular dependency in ThreadMessageLike
- 2561cc0: fix: remove double onAddToolResult call in ExternalStoreThreadRuntimeCore
- 9793e64: fix: if tool calls have no argsText, assume empty object instead of crashing
- Updated dependencies [20a4649]
- Updated dependencies [9793e64]
  - assistant-stream@0.2.19

## 0.10.25

### Patch Changes

- 65b3ff1: chore: update deps
- 2731323: refactor: rename ContentPart to MessagePart
- 308afff: feat(react): add isLoading state to ThreadList and Thread runtimes
- cc9f567: feat: allow forwarding portal props for assistant modal content
- c380f37: feat: MessageContent.ToolGroup
- Updated dependencies [65b3ff1]
  - assistant-stream@0.2.18
  - assistant-cloud@0.0.3

## 0.10.24

### Patch Changes

- b65e354: docs: add JSDoc comments
- 8eda24b: performance: Memoize Array.from() calls in render methods
- 644abb8: chore: update deps
- Updated dependencies [644abb8]
  - assistant-stream@0.2.17
  - assistant-cloud@0.0.2

## 0.10.23

### Patch Changes

- 1b77d8a: fix: Add missing `useLocalThreadRuntime` export

## 0.10.22

### Patch Changes

- 5a86bda: feat(runtime): export `useLocalThreadRuntime` for more flexibility and runtime customization
- 7a65c80: feat(assistant-cloud): filesToPdf support
- Updated dependencies [51b8493]
  - assistant-stream@0.2.15

## 0.10.21

### Patch Changes

- 57b5735: fix: logic for ComposerPrimitive.Input disabled prop

## 0.10.20

### Patch Changes

- 8aa3020: Fix: Export missing adapter primitives
- f69ca69: fix(react): preserve message metadata in useThreadRuntime().append()

## 0.10.19

### Patch Changes

- d0867eb: fix(message): add missing condition in `MessageIf`
- 52e18bc: feat: addToolResponse ToolResponse support
- 52e18bc: fix: add support for artifact and isError for langgraph tool calls
- Updated dependencies [52e18bc]
  - assistant-stream@0.2.14

## 0.10.18

### Patch Changes

- 3ed39ef: feat: export MessagePartStatus

## 0.10.17

### Patch Changes

- fix: useInlineRender should correctly handle updates

## 0.10.16

### Patch Changes

- fix: Last is not a partial call attempt 3
- Updated dependencies
  - assistant-stream@0.2.13

## 0.10.15

### Patch Changes

- fix: add another workaround for Last is not a partial call
- Updated dependencies
  - assistant-stream@0.2.12

## 0.10.14

### Patch Changes

- fix: Last is not a partial call error
- Updated dependencies
  - assistant-stream@0.2.11

## 0.10.13

### Patch Changes

- 971b05c: feat: useCloudRuntime (wip)

## 0.10.12

### Patch Changes

- chore: update deps
- Updated dependencies
  - assistant-stream@0.2.10

## 0.10.11

### Patch Changes

- 6d214b9: add ComposerAttachmentDropzone component to enable file drag and drop

## 0.10.10

### Patch Changes

- 9811ff8: Introduced a new `ErrorPrimitive` component for displaying error messages in the UI, including `ErrorPrimitive.Root` and `ErrorPrimitive.Message`.

  Added `MessagePrimitive.Error` for rendering error states in messages.

- 1a4927a: feat: ThreadListItem.detach()

## 0.10.9

### Patch Changes

- fix: correctly forward state updates from ChatModelAdapter

## 0.10.8

### Patch Changes

- 5cb9598: feat(assistant-stream): ObjectStream
- Updated dependencies [5cb9598]
  - assistant-stream@0.2.7

## 0.10.7

### Patch Changes

- 621f35a: fix: patch Safari/iOS attachment issue by adding/removing input element to DOM
- Updated dependencies [0809c9f]
  - assistant-stream@0.2.6

## 0.10.6

### Patch Changes

- e63d574: feat: MessagePrimitive.If last

## 0.10.5

### Patch Changes

- e9f8e7e: feat: tighten tool args type to be object
- c4c60cf: fix: server-side tool results should be forwarded to StreamCallController
- 73a6ff1: feat: Tool.type
- Updated dependencies [c4c60cf]
- Updated dependencies [73a6ff1]
  - assistant-stream@0.2.5

## 0.10.4

### Patch Changes

- 98a680e: fix: allow import from route handlers
- 98a680e: chore: update deps
- Updated dependencies [98a680e]
  - assistant-stream@0.2.4

## 0.10.3

### Patch Changes

- 30ae924: fix: disabled tools should still execute if invoked

## 0.10.2

### Patch Changes

- fix: ESM without bundler compat

## 0.10.1

### Patch Changes

- fix: correctly include Typescript declarations

## 0.10.0

### Patch Changes

- 557c3f7: build: drop CJS builds

## 0.9.6

### Patch Changes

- chore: update deps

## 0.9.5

### Patch Changes

- chore: bump assistant-stream dependency
- 1ad0696: feat: assistant-ui update CLI command

## 0.9.4

### Patch Changes

- c77ef43: feat: assistant-ui update CLI command

## 0.9.3

### Patch Changes

- 62c2af7: feat: tool.streamCall API
- b9c731a: chore: update dependencies

## 0.9.2

### Patch Changes

- 553bdff: feat: early return ChatModelAdapter.run on cancellation
- c0c9422: feat: useToolArgsFieldStatus
- 675fb20: feat: export types from `external-store`
- 4e86ab4: fix: should allow sending assistant messages from the composer
- e893985: fix: allow useMessagePartText on reasoning parts
- 0500584: fix: make addResult typesafe

## 0.9.1

### Patch Changes

- chore: update deps

## 0.9.0

### Patch Changes

- afae5c9: refactor!: edge package split
- Updated dependencies [1f65c94]
- Updated dependencies [8df35f6]
- Updated dependencies [476cbfb]
  - assistant-stream@0.0.33

## 0.8.20

### Patch Changes

- Updated dependencies [545a17c]
  - assistant-stream@0.0.32

## 0.8.19

### Patch Changes

- 93c3eb4: fix: drop ToolResponseBrand
- Updated dependencies [93c3eb4]
  - assistant-stream@0.0.31

## 0.8.18

### Patch Changes

- a22bc7a: refactor: merge setResult and setArtifact to setResponse
- 39aecd7: chore: update dependencies
- Updated dependencies [a22bc7a]
- Updated dependencies [39aecd7]
  - assistant-stream@0.0.30

## 0.8.17

### Patch Changes

- feat: expose assitant-stream ToolResponse API
- Updated dependencies
  - assistant-stream@0.0.29

## 0.8.16

### Patch Changes

- 40579cd: feat: ToolResponse support
- Updated dependencies [40579cd]
  - assistant-stream@0.0.28

## 0.8.15

### Patch Changes

- fix: assistant-stream appendText must only append to the very last part
- Updated dependencies
  - assistant-stream@0.0.27

## 0.8.14

### Patch Changes

- feat: update resumeRun signature

## 0.8.12

### Patch Changes

- c4d7b29: feat: tool call artifacts
- 0962274: feat: ThreadRuntime.unstable_resumeRun
- Updated dependencies [c4d7b29]
  - assistant-stream@0.0.26

## 0.8.11

### Patch Changes

- Updated dependencies
  - assistant-stream@0.0.25

## 0.8.10

### Patch Changes

- Updated dependencies
  - assistant-stream@0.0.24

## 0.8.9

### Patch Changes

- fix: adjust message status even if no message-finish event is emitted

## 0.8.8

### Patch Changes

- 439ae67: fix: properly emit tool-call args-text finish
- Updated dependencies [439ae67]
  - assistant-stream@0.0.23

## 0.8.7

### Patch Changes

- ecc6afd: feat: ThreadHistoryAdapter.resume
- b07603d: feat: assistant-stream rewrite
- b07603d: feat: use assistant-stream
- Updated dependencies [b07603d]
  - assistant-stream@0.0.22

## 0.8.6

### Patch Changes

- f8a157a: Add support for dynamic headers in EdgeChatAdapter
- 2497388: fix: useAssistantInstructions should correctly update on disabled change

## 0.8.5

### Patch Changes

- chore: update deps

## 0.8.4

### Patch Changes

- 4f22af9: fix: infinite rerender bug with useThread

## 0.8.3

### Patch Changes

- 2e299b6: chore: update typescript

## 0.8.2

### Patch Changes

- feat: source message parts

## 0.8.1

### Patch Changes

- ba4a282: fix: cloud env variable loading

## 0.8.0

### Breaking changes

- pre-styled UI components have moved to `@assistant-ui/react-ui`
- run `npx assistant-ui upgrade` to update your codebase
- manual upgrade: change styled component imports from `@assistant-ui/react` to `@assistant-ui/react-ui` (and same with markdown)

* manual upgrade: change styled component imports from `@assistant-ui/react` to `@assistant-ui/react-ui` (and same with Markdown)

## 0.7.91

### Patch Changes

- feat: dispatch events for edit action; allow text area

## 0.7.90

### Patch Changes

- feat: makeAssistantVisible editable

## 0.7.89

### Patch Changes

- 5540aae: feat: local runtime SuggestionAdapter

## 0.7.88

### Patch Changes

- a36fd9e: fix: bind reset method

## 0.7.87

### Patch Changes

- e01b6cd: fix: remove reset() method on local-runtime
- 2dd5abc: feat: makeAssistantReadable
- 4531190: feat: ExportdMessageRepository.fromArray
- 400ff97: feat:thread.import() should reset the MessageRepository

## 0.7.86

### Patch Changes

- 4685652: feat: useToolArgsFieldStatus

## 0.7.85

### Patch Changes

- 3454871: fix: Vite bundler compat

## 0.7.84

### Patch Changes

- fix: pin nanoid version for CJS compat
- Updated dependencies
  - assistant-stream@0.0.21

## 0.7.83

### Patch Changes

- 54b631c: chore: update README

## 0.7.82

### Patch Changes

- 934ee4b: feat: anonymous login and auto-config for cloud

## 0.7.81

### Patch Changes

- 7f7ab5e: refactor: assitant-stream API
- Updated dependencies [7f7ab5e]
  - assistant-stream@0.0.20

## 0.7.80

### Patch Changes

- fix: relax ReadonlyJSONObject requirement on tool/toolUI

## 0.7.79

### Patch Changes

- fix: argsText parsing

## 0.7.78

### Patch Changes

- fix: result sometimes set to undefined

## 0.7.77

### Patch Changes

- f2a1e86: feat: unstable_humanToolNames

## 0.7.76

### Patch Changes

- fix: README

## 0.7.75

### Patch Changes

- 87fa024: fix: remove tailwind from peerdeps

## 0.7.74

### Patch Changes

- 61f278b: fix: drop tailwind peer dependency

## 0.7.73

### Patch Changes

- fix: return from createMessageConverter
- 86ba433: fix: ToolMessagePart.args should never be null

## 0.7.72

### Patch Changes

- 797ce9c: fix: ToolMessagePart.args should never be null

## 0.7.71

### Patch Changes

- 72e66db: chore: update dependencies
- Updated dependencies [72e66db]
  - assistant-stream@0.0.19

## 0.7.70

### Patch Changes

- 55a9cb2: fix: runConfig for reload / edits
- 2bc6781: feat: send toolCallId to the exeucte callback
- 2bc6781: feat: Tool.experimental_onSchemaValidationError
- 9fefc9d: feat: ThreadViewportContext & multiple renders of the same thread support

## 0.7.69

### Patch Changes

- a7a871e: feat: make ThreadPrimitive.Suggestion method optional
- a7a871e: fix: ThreadPrimitive.Suggestion no longer clears the composer
- a7a871e: feat: expose the useThreadViewportAutoScroll in the API

## 0.7.68

### Patch Changes

- eb4e13c: feat: useExternalMessageConverter megeConfig.joinStrategy

## 0.7.67

### Patch Changes

- ddf468e: fix: import path

## 0.7.66

### Patch Changes

- f4d71da: feat: Edge Runtime onResponse/onError/onfinish, sendExtraMessageFields, unstable_AISDKInterop=v2 support
- 16cd124: feat(local-runtime): native support for AssistantCloud

## 0.7.65

### Patch Changes

- a07d8c1: fix: thread auto-scroll reliability

## 0.7.64

### Patch Changes

- 6703842: feat: codemod to migrate to @assistant-ui/react-ui
- 79f7120: feat: createMessageConverter API

## 0.7.63

### Patch Changes

- 843047d: feat(thread-list): forward model context to thread runtimes

## 0.7.62

### Patch Changes

- 7e5f127: fix: useSmooth unnecessary re-renders

## 0.7.61

### Patch Changes

- bd78a70: feat: ThreadListPrimitive.Root
- 9ea8100: feat: ThreadMessageLike optional toolCallId + args

## 0.7.60

### Patch Changes

- 246ce4e: fix: export getExternalStoreMessages

## 0.7.59

### Patch Changes

- 8ec1f07: feat: AssistantCloudThreadHistoryAdapter
- 4f5d77f: feat: ToolCallMessagePart.args should be JSONObject
- 8ec1f07: feat: auto-inject history adapter in local runtime

## 0.7.58

### Patch Changes

- 02996f9: fix: support AISDKInterop + sendMessageId for human+system messages

## 0.7.57

### Patch Changes

- 103efee: fix: mark ChatAdapter types as readonly
- 60bb6ff: fix: memoize MessageRepository.getMessages()

## 0.7.56

### Patch Changes

- dba4dde: feat(ai-sdk): message.metadata.annotations
- efd60fe: fix(ai-sdk): onSwitchToThread

## 0.7.55

### Patch Changes

- 0bf5082: fix: tailwindcss plugin crashes without config

## 0.7.54

### Patch Changes

- 6cb7d10: refactor: rename ModelConfig to ModelContext
- c302933: feat: convertExternalMessages

## 0.7.53

### Patch Changes

- 7618bf3: feat: AI SDK DataStream ReasoningDelta, StartStep support

## 0.7.52

### Patch Changes

- fix: excessive number of classes included via tailwindcss plugin

## 0.7.51

### Patch Changes

- fix: crash when message part is empty

## 0.7.50

### Patch Changes

- fix: properly forward unstable_shouldContinueIgnoreToolNames

## 0.7.49

### Patch Changes

- feat(local-runtime): add temporary shouldContinueIgnoreToolNames override

## 0.7.48

### Patch Changes

- fix: crash

## 0.7.47

### Patch Changes

- a3c6c1a: feat: ensure runtime methods are bound to the object
- a76ea0e: feat: AttachmentAdapter file upload progress update support via generator add callback
- a3c6c1a: feat: useRuntimeState API

## 0.7.46

### Patch Changes

- fix: improved interrupt+Command support
- feat: MessagesFooter UI
- 2713487: feat: styled UI assistant message footer

## 0.7.45

### Patch Changes

- 9934aef: feat(cloud-threadlist): auto initialize threads
- 3a8b55a: feat: styled UI assistant message footer

## 0.7.44

### Patch Changes

- 2f44e9e: refactor: move switchToThread / switchToNewThread to runtime.threads
- 2f44e9e: refactor: rename runtime.threadList to runtime.threads
- 2f44e9e: refactor: drop CloudThreadListItemRuntime
- 2f44e9e: feat: add threads.getById and threads.main
- 2f44e9e: feat: ThreadListItemRuntime.initialize()

## 0.7.43

### Patch Changes

- feat: reverse order of threads in useRemoteThreadListRuntime

## 0.7.42

### Patch Changes

- 9c3961d: fix: event subscriptions triggering on threadList changes

## 0.7.41

### Patch Changes

- 08de9c9: fix: RemoteThreadList should not return an iterator

## 0.7.40

### Patch Changes

- feat: export useRemoteThreadListRuntime

## 0.7.39

### Patch Changes

- 0979334: feat(local-runtime): New ThreadList items should appear at the top of the list
- 22272e6: chore: update dependencies
- Updated dependencies [b44a7ad]
- Updated dependencies [22272e6]
  - assistant-stream@0.0.18

## 0.7.38

### Patch Changes

- 5794b1b: feat: CreateStartRunConfig

## 0.7.37

### Patch Changes

- 799dc79: feat: AppendMessage.sourceId
- 799dc79: feat: StartRunConfig.sourceId

## 0.7.36

### Patch Changes

- 34d2915: feat: widen initialMessages type to ThreadMessageLike
- 4f3834a: refactor: deprecate UIMessagePart
- b8b11d3: feat: FileMessagePart
- 889a55e: fix: attachment filename should never overflow
- a7d9e41: feat: ComposerRuntime.unstable_on("attachment_add", ...)

## 0.7.35

### Patch Changes

- 345f3d5: chore: update dependencies
- 345f3d5: fix: import errors in react server environments
- 2846559: feat: allow selecting multiple files as attachments

## 0.7.34

### Patch Changes

- 9a3dc93: fix(external-store): metadata & attachments support
- 4c2bf58: chore: update dependencies

## 0.7.33

### Patch Changes

- bb47b90: fix: invalid JSON in argsText should be gracefully handled

## 0.7.32

### Patch Changes

- feat: MessagePrimitive.tools.Override

## 0.7.31

### Patch Changes

- fix: data results should be forwarded via LocalThreadRuntime

## 0.7.30

### Patch Changes

- 982a6a2: chore: update dependencies

## 0.7.29

### Patch Changes

- 75a274f: feat: AssistantRuntimeCore.RenderComponent
- dcf51cb: fix: do not throw on AI SDK annotation packets
- 9ad9e75: fix: mark arrays in message types as readonly
- 75a274f: refactor: drop AssistantRuntimeCore.Provider due to causing app rerenders on runtime switch
- 65de5d6: feat: message.metadata.unstable_data

## 0.7.28

### Patch Changes

- a8ac203: feat: export useThreadListItemRuntime

## 0.7.27

### Patch Changes

- 528cfd3: feat: ExternalStoreAdapter.unstable_Provider
- 3c70ea1: feat: allow customizing thread max width

## 0.7.26

### Patch Changes

- 6a17ec2: feat: useAssistantInstructions disable support

## 0.7.25

### Patch Changes

- 798e9f3: fix: AttachmentRemove should not trigger AttachmentPreviewDialog
- 37e1abc: feat: ComposerRuntime.clearAttachments
- d6b3b79: feat: useRemoteThreadListRuntime

## 0.7.24

### Patch Changes

- fix: ComposerRuntime.send() should not reset role or runConfig

## 0.7.23

### Patch Changes

- feat(edge-runtime): pass RunConfig to backend

## 0.7.22

### Patch Changes

- feat: RunConfig

## 0.7.21

### Patch Changes

- feat: Composer.unstable_on("send", callback)

## 0.7.20

### Patch Changes

- 2c7dec0: feat: useAssistantTool allow disabling tools

## 0.7.19

### Patch Changes

- ec3b8cc: chore: update dependencies

## 0.7.18

### Patch Changes

- 1b16dce: fix: thread initialization
- b0f309a: feat: allow specifying Empty component in thread-config

## 0.7.17

### Patch Changes

- fix: toLanguageModelMessages should include attachments

## 0.7.16

### Patch Changes

- fix: ensure message status is set on runResultStream flush

## 0.7.15

### Patch Changes

- fix: toolResultStream should support JSONSchema params

## 0.7.14

### Patch Changes

- fix: assistantDecoderStream should end current tool call on flush

## 0.7.12

### Patch Changes

- 4c54273: chore: update dependencies
- 4c54273: fix: initialize thread on import

## 0.7.11

### Patch Changes

- 0f88efb: fix: external store thread list should not crash

## 0.7.10

### Patch Changes

- 1eab7b4: refactor: ThreadList

## 0.7.9

### Patch Changes

- 2276e57: fix: cjs builds
- e8752ac: fix: ThreadList a11y improvements

## 0.7.8

### Patch Changes

- 589d37b: feat: ThreadList / ThreadListItem UI
- 2112ce8: chore: update dependencies

## 0.7.7

### Patch Changes

- 10d70db: fix: remove console.log
- c3027a0: fix: disallow nested ThreadConfigs

## 0.7.6

### Patch Changes

- 933b8c0: chore: update deps
- 09a2a38: fix: TextMessagePartProvider should support MessagePartRuntime.getState()

## 0.7.5

### Patch Changes

- c59d8b5: chore: update dependencies

## 0.7.4

### Patch Changes

- 5462390: fix: Thread.Messages AssistantEditComposer support
- 0fb80c1: feat: ThreadConfig.UserMessage / AssistantMessage / EditComposer

## 0.7.3

### Patch Changes

- 0dcd9cf: feat: mark message types as readonly

## 0.7.2

### Patch Changes

- 7fa9a1b: feat: ThreadMessageLike metadata support
- 1a1f4a5: feat: message metadata for all message types

## 0.7.1

### Patch Changes

- c2f75e5: feat: ThreadListRuntime API types

## 0.7.0

### Breaking Changes

- c6e886b: refactor!: drop deprecated features

### Patch Changes

- 2912fda: feat: ThreadListItemPrimitive

## 0.5.100

### Patch Changes

- b5f92fe: fix(external-store): crash on cancel when using separate converter, fix branching

## 0.5.99

### Patch Changes

- cdcfe1e: feat: ThreadListItemPrimitive (wip)
- cdcfe1e: fix: add React 19 RC to peerDeps
- 94feab2: feat: ComposerState.role / ComposerRuntime.setRole
- 472c548: feat: ThreadListPrimitive
- 14da684: feat: AppendMessage.startRun flag
- 1ada091: chore: update deps

## 0.5.98

### Patch Changes

- ff5b86c: build: refactor build script into @assistant-ui/tsbuildutils
- ff5b86c: fix: better ESM compatibility
- ff5b86c: chore: update deps

## 0.5.97

### Patch Changes

- 9a9c01d: feat(edge-runtime): add unstable_AISDKInterop flag

## 0.5.96

### Patch Changes

- fix: properly pass initialMessages to LocalRuntime

## 0.5.95

### Patch Changes

- fix: include generated css files in bundle

## 0.5.94

### Patch Changes

- fix: toMessagePartStatus support for parallel tool calls

## 0.5.93

### Patch Changes

- d2375cd: build: disable bundling in UI package releases

## 0.5.92

### Patch Changes

- f6d197a: feat: Edge Runtime Server Accessible Ids (temp)

## 0.5.91

### Patch Changes

- 56f80fa: fix: tailwind plugin turbopack interop

## 0.5.90

### Patch Changes

- 2090544: fix: attachments infinite rerender bug
- be04b5b: feat: Unstable_AudioMessagePart (wip)
- 2090544: fix: Attachment preview accessibility
- fb32e61: chore: update deps
- fb32e61: feat: react-19 support

## 0.5.89

### Patch Changes

- fd9ff67: fix(local-runtime): update capabilities on initial render

## 0.5.88

### Patch Changes

- 0afecda: fix(ai-sdk): server-side maxSteps interop

## 0.5.87

### Patch Changes

- b38165d: feat: export useAttachmentRuntime, useAttachment, FeedbackAdapter
- a1bfd26: fix(ai-sdk): DataStream interop without tool call streaming
- b38165d: feat(ai-sdk): Adapters support (attachment, feedback, speech, threadManager)

## 0.5.86

### Patch Changes

- fix: do not cache adapter in useEdgeRuntime

## 0.5.85

### Patch Changes

- 3a602b9: fix: correctly handle new thread creation

## 0.5.84

### Patch Changes

- ba5116f: feat: useInlineRender hook

## 0.5.83

### Patch Changes

- c38a018: feat: ThreadListRuntime

## 0.5.82

### Patch Changes

- 0edadd1: feat: useThreadModelConfig API
- 1aeda53: feat: Runtime.path API
- 0c8277e: feat: MessageRuntime.unstable_getCopyText API
- 91d3951: feat: MessageRuntime.getMessagePartByToolCallId
- cf6861c: refactor!: simplify SpeechSynthesisAdapter to accept a text string
- 7c76939: feat: ThreadRuntime.getMesssageById

## 0.5.79

### Patch Changes

- feat: allow out of order tool args streaming

## 0.5.78

### Patch Changes

- dba0082: fix: border should apply to all aui-root children
- b182ea5: feat: Events API (experimental)

## 0.5.77

### Patch Changes

- 0a3bd06: feat: Attachment image thumbnail and previews

## 0.5.76

### Patch Changes

- c3806f8: fix: do not export internal Runtime types
- 899b963: refactor: add BaseThreadRuntimeCore class
- 899b963: feat: work towards Edit Composer attachment support
- 899b963: refactor: remove composerState.attachmentAccept, add composerRuntime.getAttachmentAccept()
- 8c80f2a: feat: MessageState.submittedFeedback state
- 809c5c1: feat: New Attachment UI

## 0.5.75

### Patch Changes

- 31702b2: feat: MessageRuntime.stopSpeaking MessageState.speech state
- 44bfecd: refactor: move primitive types under the same namespace as the primitive components

## 0.5.74

### Patch Changes

- 3d31f10: refactor: deprecate primitive-hooks
- cf872da: feat: AttachmentPrimitive

## 0.5.73

### Patch Changes

- fb46305: chore: update dependencies
- e225116: feat(ui): add component override option for ThreadWelcome
- 0ff22a7: feat: switch to DataStream transfer protocol for edge runtime
- 378ee99: refactor: rename maxToolRoundtrips to maxSteps
- 378ee99: feat: server-side tool roundtrips support

## 0.5.72

### Patch Changes

- d0db602: fix: useDangerousInBrowserRuntime correct options forwarding

## 0.5.71

### Patch Changes

- 55942d8: fix: useMessagePartText backwards compat type
- e455aff: feat: FollowupSuggestions
- f7c156b: feat: mark new runtime API methods as stable
- f6a832e: chore: update dependencies
- 2b7c6fe: refactor: define interface types for the new runtime API

## 0.5.70

### Patch Changes

- 3df0061: fix: TextMessagePartProvider missing fields

## 0.5.69

### Patch Changes

- 46f91c2: feat(langgraph): allow disabling autocancellation of pending tool calls

## 0.5.68

### Patch Changes

- 96b9d1f: feat: new Runtime API part 8
- 9fd85da: fix: ensure branch picker is supported before showing it
- d8bd40b: chore: update dependencies
- 42156cf: refactor: drop ReactThreadRuntimeCore, unstable_synchronizer

## 0.5.67

### Patch Changes

- cfa8844: feat: useComposerRuntime hook
- 70720ba: feat: lift EditComposer to runtime layer

## 0.5.66

### Patch Changes

- 325b049: fix: include attachments prop in the useExternalMessageConverter
- df9ec8f: feat: new Runtime API rollout part 2
- 3f549b2: refactor: rename internal export

## 0.5.65

### Patch Changes

- 27208fb: fix: only include "use client" banner in ESM builds

## 0.5.64

### Patch Changes

- ed24305: fix: add newline after "use client" for .js builds

## 0.5.63

### Patch Changes

- c438773: feat: allow disabling ComposerInput keyboard shortcuts
- e1ae3d0: chore: update dependencies

## 0.5.62

### Patch Changes

- cd1b286: fix: BranchPicker styles

## 0.5.61

### Patch Changes

- 88957ac: feat: New unified Runtime API (part 1/n)
- 1a99132: feat: ThreadRuntime.Composer subscribe
- 3187013: feat: add status, attachments and metadata fields to all messages

## 0.5.60

### Patch Changes

- 926dce5: feat: Feedback Primtives, UI and Adapter
- 155d6e7: chore: update dependencies
- f80226f: feat: ThreadActions.getModelConfig

## 0.5.59

### Patch Changes

- 0f547a9: fix: useSmooth should work inside TextMessagePartProvider

## 0.5.58

### Patch Changes

- 6507071: fix: TextMessagePartProvider text streaming support
- 6507071: feat: TextMessagePartProvider isRunning

## 0.5.57

### Patch Changes

- 745d6e1: fix(runtimes/external-store): switch to thread should correctly copy the entire store
- 745d6e1: fix: only deprecate the null usage of switchToThread

## 0.5.56

### Patch Changes

- e4863bb: feat(runtimes/external): add onSwitchToNewThread callback
- e4863bb: feat: add attachmentAccept to ThreadComposer

## 0.5.55

### Patch Changes

- b0a22e3: feat: runtime.switchToNewThread()
- 11ca453: refactor: drop useModelConfig Context - use useAssistantActions instead

## 0.5.54

### Patch Changes

- 0f99aa6: feat: New Context API
- c348553: chore: update dependencies

## 0.5.53

### Patch Changes

- f0f7497: feat: MessageContent Empty should be displayed for empty messages with empty text part
- 8555685: feat: allow editing assistant/system messages
- 892b019: fix: Empty should default to the provided Text component

## 0.5.52

### Patch Changes

- c0f975a: feat: TextMessagePartProvider

## 0.5.51

### Patch Changes

- 164e46c: feat: ignore edits with text part unchanged
- 5eccae7: fix: createActionButton disabled handling

## 0.5.50

### Patch Changes

- 04f6fc8: chore: update deps

## 0.5.49

### Patch Changes

- 7ed296b: fix: make AppendMessage attachments field optional for now

## 0.5.48

### Patch Changes

- 25a711d: fix: user message action bar css

## 0.5.47

### Patch Changes

- a81b18f: feat: ComposerPrimitive.AddAttachment
- 44d08bd: feat: styled components for attachments
- b48fbcc: feat: UserMessageAttachment UI
- cc5e7d4: perf: memoize tool Ul components
- bdd3084: feat: allow runtimes to signal support for attachments
- 7dcab47: fix: message copy handling for runtimes
- a22e6bb: feat: AttachmentAdapter.accept allow attachment adapters to specify supported file types
- 9e00772: feat: add composer attachments state
- d2580d3: feat: SimpleImageAttachmentAdapter
- c845fcf: feat: allow sending attachment-only messages
- 3ba193e: feat: AttachmentContext
- d2580d3: feat: SimpleTextAttachmentAdapter
- 3b0f20b: feat: MessagePrimitive.Attachments
- 3ba193e: feat: ComposerPrimitive.Attachments
- d2580d3: feat: CompositeAttachmentAdapter
- 44d08bd: feat: Edge/Local runtime AttachmentAdapter support

## 0.5.46

### Patch Changes

- 0a4b8d7: feat: adjust the override order of tool UIs
- 34ad491: feat: ThreadConfig.ToolFallback
- 34ad491: feat: ThreadConfig.tools
- 0a4b8d7: fix: tool UI fallback should not override makeAssistantToolUI definitions

## 0.5.45

### Patch Changes

- fb8e58f: feat: add thread runtime threadId

## 0.5.44

### Patch Changes

- b2801ce: feat(styling): cursor-not-allowed when composer input is disabled
- 0aa4e6b: fix: use-smooth-state should notdesync

## 0.5.43

### Patch Changes

- 3962831: feat: useExternalMessageConverter API
- 85defe1: feat: allow string content in ThreadMessageLike
- 6f7ccf7: feat: add toolName to addToolResult callback
- 6f7ccf7: feat: thread converter should ignore empty text parts

## 0.5.42

### Patch Changes

- c8b98b6: feat: animate composer border color on focus
- 800eb9e: fix: error on switchToThread / switchToNewThread
- 8768c67: feat: support shadcn scroll area

## 0.5.41

### Patch Changes

- f526279: feat: SpeechSyntehsis
- e8aa697: refactor: remove unsupported external runtime onCopy callback

## 0.5.40

### Patch Changes

- 4333382: fix(runtime/edge): handle maxToolRoundtrips

## 0.5.39

### Patch Changes

- ab1160c: fix: switchToThread should persist maxToolRoundtrips

## 0.5.38

### Patch Changes

- 554a423: chore: update deps

## 0.5.37

### Patch Changes

- 60c0fdc: fix: remove Composer focus ring when using @tailwindcss/forms
- edbab24: feat(runtimes/local): reset thread

## 0.5.36

### Patch Changes

- edb5a16: feat: DangerousInBrowserRuntime
- f8e2cf1: fix: @tailwindcss/forms input border

## 0.5.35

### Patch Changes

- 53cf707: fix: do not require content in ChatModelRunResult

## 0.5.34

### Patch Changes

- 3178788: feat: custom AssistantMessage metadata

## 0.5.33

### Patch Changes

- c154b8f: feat(runtime/edge): allow extra headers & body

## 0.5.32

### Patch Changes

- cd70d4f: refactor: rewrite ai-sdk integration to use external runtime

## 0.5.31

### Patch Changes

- 34621cc: feat(runtimes/edge): getEdgeRuntimeResponse API
- 2df3e73: fix: CircleStopIcon invisible on safari
- 1b9ded0: feat: lift thread composer state to ThreadRuntime.Composer

## 0.5.30

### Patch Changes

- ccf5fef: fix: do not capture enter key during IME composition events

## 0.5.29

### Patch Changes

- 556001f: chore: update deps
- 556001f: feat: tool call cancellation support

## 0.5.28

### Patch Changes

- 915b5b7: feat: expose streamUtils
- 9a55735: chore: update deps

## 0.5.27

### Patch Changes

- dbf1042: fix: minor styling fixes
- dbf1042: chore: update deps

## 0.5.26

### Patch Changes

- 440b051: fix: sending messages when thread is empty

## 0.5.25

### Patch Changes

- 0445cdf: fix: disallow sending new messages when last message is in requires-action state
- 0445cdf: refactor: remove Runtime.isRunning / auto-infer isRunning state from last message state
- 71f4b77: feat: update Tooltip styles

## 0.5.24

### Patch Changes

- a7e8ef6: refactor: rewrite external store sync
- 6629dd8: fix: render loop if a message ID is used twice

## 0.5.23

### Patch Changes

- f83e4d1: feat: LocalRuntime export / import

## 0.5.22

### Patch Changes

- 134d39e: fix: undo moving internal utilities to /react/internal

## 0.5.20

### Patch Changes

- de04d92: feat: loading status & smooth streaming interop
- 3cc67f2: refactor: move internal utilities to @assistant-ui/react/internal

## 0.5.19

### Patch Changes

- 2534938: feat: Message.Content Empty component

## 0.5.18

### Patch Changes

- 0302235: fix(external-store): add initial messages to message repository

## 0.5.17

### Patch Changes

- 4b4f9c8: feat(local-runtime): AsyncGenerator support

## 0.5.16

### Patch Changes

- 9dc942f: feat: useThread.isDisabled flag

## 0.5.15

### Patch Changes

- 0418c73: fix(runtimes/external-store): invalidate cache when isRunning changes during autoStatus

## 0.5.12

### Patch Changes

- 8688a9f: feat(runtimes/external-store): loosen the return type for convertMessage callback

## 0.5.11

### Patch Changes

- fc6bc35: feat: initialMessages SSR support

## 0.5.10

### Patch Changes

- 1c6bf72: feat(tailwindcss): allow customizing colors directly in tailwind config

## 0.5.9

### Patch Changes

- a216fbf: chore: update deps

## 0.5.6

### Patch Changes

- e5e6b20: feat(runtime): BranchPicker feature detection

## 0.5.5

### Patch Changes

- f26783a: feat(ui): allow ReactNode in SuggestionConfig.text

## 0.5.4

### Patch Changes

- f2d7590: fix(rsc): hide copy message button

## 0.5.3

### Patch Changes

- 1acdf45: feat: external store runtime

## 0.5.2

### Patch Changes

- 2d7a8bd: fix: markdown loading indicator
- 2d7a8bd: fix: ScrollToBottom visbility bug
- 2d7a8bd: fix: text message part data-status field

## 0.5.1

### Patch Changes

- ee38c0c: feat: message status v2
- ee38c0c: fix(runtimes/edge): wait for serverside tool call results before reporting onFinish
- 2baa898: chore: v5

## 0.4.6

### Patch Changes

- bc77b4f: feat(runtimes/edge): dynamic model creator functions
- e220617: feat(runtimes/edge): client side API key, model name, model parameters specification

## 0.4.4

### Patch Changes

- 998081b: fix: reduce specificity of built-in CSS styles

## 0.4.3

### Minor Changes

- feat: scrolling to bottom during streaming is now instant
- fix: useSmooth gets triggered during branch switch

## 0.4.2

### Minor Changes

- fix: issue with forwarding props to primitives

## 0.4.1

### Minor Changes

- fix: useSmooth scrolling performance in dev mode

## 0.4.0

### Minor Changes

- e0e51cf: refactor!: Rename AssistantMessage to ThreadAssistantMessage
- e0e51cf: refactor!: Rename UserMessage to ThreadUserMessage
- 679cd54: feat: system message support

### Patch Changes

- c7ba6a2: feat: Edge Runtime API
- e0e51cf: feat: add styled UI components

## 0.3.5

### Patch Changes

- ef25706: feat: Code Header and Syntax Highlighter support

## 0.3.3

### Patch Changes

- b5aa29f: feat: smooth streaming by default

## 0.3.2

### Patch Changes

- 1a8919b: feat: smooth text streaming

## 0.3.1

### Patch Changes

- 05fd5d6: feat: runtime capabilities API

## 0.3.0

### Minor Changes

- 5b68f4a: refactor!: drop Message.InProgress support

### Patch Changes

- 3dd7384: fix: better message hover state tracking
- 23f474e: fix: remove warning about useLayoutEffect in SSR

## 0.2.4

### Patch Changes

- c373fc9: feat: AssistantModalPrimitive.Anchor

## 0.2.3

### Patch Changes

- be2c26b: fix: Vercel useAssistant BranchPicker duplicates bug

## 0.2.2

### Patch Changes

- 62e9f19: feat: AssistantRuntime newThread
- 611fdcc: feat: useAssistantActions
- ca0eaa1: feat: Programmatic Interactions API

## 0.2.1

### Patch Changes

- d52c345: feat: Primitive Prop Types

## 0.2.0

### Minor Changes

- de20b1c: feat!: MessagePartText is now a <p> element
- 2ab2cab: feat!: experimental features are now marked as stable

## 0.1.12

### Patch Changes

- 904556d: feat: ComposerContext focus() API
- 33ae8f9: feat: AssistantModalPrimitive

## 0.1.11

### Patch Changes

- fd6a202: feat: Primitive Hook useThreadViewportAutoScroll
- c2a6b22: fix: improved Viewport autoscroll handling
- c2a6b22: fix: more reliable escape hotkey handling
- c2a6b22: feat: add "role" field to AppendMessage

## 0.1.10

### Patch Changes

- 269b32f: feat: Primitive Hooks API
- 2867923: feat: Composer API Docs

## 0.1.9

### Patch Changes

- ab16a99: feat: useMessageUtils Context API
- ab16a99: feat: useThreadActions Context API
- ab16a99: fix: make all Context APIs read-only

## 0.1.8

### Patch Changes

- 8513f9a: feat: ToolUI addResult API

## 0.1.7

### Patch Changes

- 36f3a1f: fix: add DisplayName to primitive components for better error logs
- 36f3a1f: chore: upgrade to radix-ui 1.1
- 36f3a1f: chore: update dependencies

## 0.1.6

### Patch Changes

- a6769d5: feat: MessagePartComponent types
- 52236ab: feat: new default chat bubble design

## 0.1.5

### Patch Changes

- 671dc86: feat: Tool Render functions

## 0.1.4

### Patch Changes

- a73b50f: fix: ComposerRoot onSubmit should be called when using keyboard shortcuts

## 0.1.3

### Patch Changes

- 6e9528d: build: add changesets
- 6e9528d: feat: add useAssistantTool API
