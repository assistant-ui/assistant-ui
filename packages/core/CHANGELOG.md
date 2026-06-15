# @assistant-ui/core

## 0.2.17

### Patch Changes

- [#4414](https://github.com/assistant-ui/assistant-ui/pull/4414) [`344f737`](https://github.com/assistant-ui/assistant-ui/commit/344f7370511f7238db17e1982f2a43a10829604c) - feat: export `fromThreadMessageLike` and `generateId` from the public API ([@okisdev](https://github.com/okisdev))

  these two utilities were only reachable via `@assistant-ui/core/internal`, so materializing a `ThreadMessageLike` into a `ThreadMessage`, or generating an id for a hand-built message, meant reaching into internals (the first-party ag-ui and a2a runtimes already did). they are now exported from `@assistant-ui/core`, `@assistant-ui/react`, `@assistant-ui/react-native`, and `@assistant-ui/react-ink`. also removes the now-redundant duplicate listing of both from the unstable `INTERNAL` namespace (the one in-repo consumer, the with-ffmpeg example, now uses the public export).

- [#4415](https://github.com/assistant-ui/assistant-ui/pull/4415) [`a2e21ee`](https://github.com/assistant-ui/assistant-ui/commit/a2e21ee797761907db9b7e4559da2a41afd00fc9) - perf: sync the external-store `messageRepository` incrementally instead of clear()+import() ([@okisdev](https://github.com/okisdev))

  when an `ExternalStoreAdapter` drives the thread via `messageRepository`, each update tore the whole repository down (`clear()`) and rebuilt it from scratch (`import()`). it now diffs against the current repository (add or update incoming messages, delete the ones no longer present), so unchanged messages keep their existing per-message repository state instead of being recreated, and short-circuits when only `isRunning` flips on an unchanged repository reference. behavior is unchanged; this removes the teardown/rebuild churn on high-frequency streaming that previously pushed consumers to subclass the runtime core.

## 0.2.16

### Patch Changes

- [#4393](https://github.com/assistant-ui/assistant-ui/pull/4393) [`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d) - fix: resolve typecheck regressions ([@Yonom](https://github.com/Yonom))

- [#4392](https://github.com/assistant-ui/assistant-ui/pull/4392) [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda) - chore: update peer and dependency ranges for @assistant-ui/tap 0.9 ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d)]:
  - assistant-stream@0.3.23

## 0.2.15

### Patch Changes

- [#4367](https://github.com/assistant-ui/assistant-ui/pull/4367) [`c207bcd`](https://github.com/assistant-ui/assistant-ui/commit/c207bcda24468c1ae6e5adb61054a3682d3ff1d8) - feat: add reasoningEffort to LanguageModelConfig ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#4385](https://github.com/assistant-ui/assistant-ui/pull/4385) [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff) - feat: precompile packages with React Compiler ([@Yonom](https://github.com/Yonom))
  - aui-build runs React Compiler over packages that depend on tap and remaps `react/compiler-runtime` to the tap shim subpath, so compiled hooks and components work both in React components and inside tap resource renders
  - `@assistant-ui/tap/react-shim` exports `useMemoCache` (tap inside a resource render, `React.__COMPILER_RUNTIME.c` otherwise, with a React 18 polyfill); new `@assistant-ui/tap/react-shim/compiler-runtime` subpath mirrors `react/compiler-runtime`'s `c` export
  - tap implements `useSyncExternalStore` and a no-op `useDebugValue`; `useSubscribable` now builds on `useSyncExternalStore` so its store reads stay visible to the compiler
  - `AssistantProviderBase` opts out via `"use no memo"` because the runtime receives options through an effect inside a re-rendered child element

- [#4378](https://github.com/assistant-ui/assistant-ui/pull/4378) [`4583ca7`](https://github.com/assistant-ui/assistant-ui/commit/4583ca7477c834ef0906e7268005b469c7300cbe) - feat: approval options vocabulary on tool approvals. `ToolCallMessagePart.approval` gains request-supplied `options` (machine-readable kinds allow-once / allow-always / reject-once / reject-always, open to `_`-prefixed custom kinds), a recorded `optionId`, and a terminal `resolution` ("cancelled" | "expired") for non-decision outcomes. `respondToApproval` additionally accepts `{ optionId }`, resolved in core against the option's kind; custom kinds require an explicit `approved`. `ExternalThread` gains an `onRespondToToolApproval` callback. The kit approval bar renders supplied options with an opt-in confirmation step showing the grants an option would persist. Persistence stays host-owned. ([@okisdev](https://github.com/okisdev))

- [#4379](https://github.com/assistant-ui/assistant-ui/pull/4379) [`94cc028`](https://github.com/assistant-ui/assistant-ui/commit/94cc02875b4e813e1af7020709511bb5f61e6067) - feat: per-tool-call timing and stall detection. `ToolCallMessagePart` gains a `timing` field (`{ startedAt, completedAt? }` in epoch ms), auto-populated by the assistant-stream accumulator at part start and result, and accepted on `ThreadMessageLike` for external-store hosts. New `useToolCallElapsed()` hook returns the call's elapsed milliseconds, ticking once per second while running; `unstable_useMessageStallDetection({ thresholdMs })` reports mid-run output stalls by watching a message content fingerprint. The kit `ToolFallback` trigger renders the duration when timing is present. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`94cc028`](https://github.com/assistant-ui/assistant-ui/commit/94cc02875b4e813e1af7020709511bb5f61e6067)]:
  - assistant-stream@0.3.22

## 0.2.14

### Patch Changes

- [#4340](https://github.com/assistant-ui/assistant-ui/pull/4340) [`ab8e5bc`](https://github.com/assistant-ui/assistant-ui/commit/ab8e5bc8650b1e39c8f01ab6c0efb80aa8baf723) - fix: exclude reasoning parts from copied message text ([@serhiizghama](https://github.com/serhiizghama))

  `getCopyText` filtered parts with `"text" in part`, which also matched `reasoning` parts (they carry a `text` field), leaking the model's chain-of-thought into the clipboard. Both copy paths now delegate to the canonical `getThreadMessageText`, so copy returns only `type: "text"` content — consistent with the rest of the runtime.

- [#4359](https://github.com/assistant-ui/assistant-ui/pull/4359) [`59d252f`](https://github.com/assistant-ui/assistant-ui/commit/59d252fa09c1511acd7e31c9d8178514c5a5cb77) - feat: branch switching for the ExternalThread client ([@okisdev](https://github.com/okisdev))

  `ExternalThread` accepts an optional `branches` adapter (`ExternalThreadBranchAdapter` in `@assistant-ui/core`, re-exported from `@assistant-ui/react`): `getBranches(messageId)` returns ordered sibling branch ids and `switchToBranch(branchId)` makes a sibling visible by swapping the `messages` array. messages with more than one sibling get real `branchNumber`/`branchCount`, which is what shows the branch picker; `capabilities.switchToBranch` is set for parity with the legacy external store. without the adapter, behavior is unchanged.

- [#4347](https://github.com/assistant-ui/assistant-ui/pull/4347) [`feecac3`](https://github.com/assistant-ui/assistant-ui/commit/feecac38c6ba0f8f30ec356376d1d6b19188e08f) - feat: support tool approvals on the local runtime ([@okisdev](https://github.com/okisdev))

  `LocalRuntime.respondToToolApproval` previously threw "Local runtime does not support tool approvals". the local runtime now implements the approval gate natively, treating the `ChatModelAdapter` as the server side of the protocol: the adapter emits `approval: { id }` on a tool call part and ends the run with `requires-action`. a pending approval pauses the run (previously `shouldContinue` ignored approvals, so an unlisted tool call carrying one re-invoked the adapter in a loop). denying records the decision and synthesizes an error result (`{ error: reason || "Tool approval denied" }` with `isError: true`, matching the AI SDK v6 denial shape); approving records the decision and resumes the run once every gate on the message is decided, with the decisions readable via `unstable_getMessage()`. tool calls carrying an approval are exempt from the `unstable_humanToolNames` result requirement, and a gated call that receives a result via `addToolResult` counts as resolved, so neither combination deadlocks.

  resumed runs (from `respondToToolApproval` and `addToolResult` alike) now go through the same run loop as `startRun`: they continue multi-step turns instead of stalling after one roundtrip, emit `runStart`/`runEnd` events, mark the message queue busy so a concurrent send no longer aborts the in-flight roundtrip, and regenerate suggestions on completion. `addToolResult` also notifies subscribers when it records a result without resuming. `resumeToolCall` still throws, now with an error that points at the supported alternatives, and the `unstable_humanToolNames` JSDoc no longer describes the pause as an approval ([#4339](https://github.com/assistant-ui/assistant-ui/issues/4339)).

- [#4325](https://github.com/assistant-ui/assistant-ui/pull/4325) [`5a4f20e`](https://github.com/assistant-ui/assistant-ui/commit/5a4f20e75dcd93aeb70a4a5582a0a5a1f870b4f2) - chore: update @assistant-ui/tap dependency ranges to ^0.7.0 ([@Yonom](https://github.com/Yonom))

- [#4328](https://github.com/assistant-ui/assistant-ui/pull/4328) [`f10b8ae`](https://github.com/assistant-ui/assistant-ui/commit/f10b8ae6659ed8df8b0c25b5bb2bb8cfa7d7a718) - feat: expose `lastMessageAt` on thread list items, populated from the cloud thread list adapter ([@okisdev](https://github.com/okisdev))

- [#4351](https://github.com/assistant-ui/assistant-ui/pull/4351) [`1fb5862`](https://github.com/assistant-ui/assistant-ui/commit/1fb586241534064fa48e3498f422bdaa7f382139) - fix: stable identity for grouped message parts across reorders ([@okisdev](https://github.com/okisdev))

  tool groups (and chain-of-thought groups) in `MessagePrimitive.Parts` and group nodes in `MessagePrimitive.GroupedParts` are now keyed by the id of their first part (`toolCallId`) instead of their positional index, and tool parts inside a group are keyed by their own id. when a message's parts array re-orders between live streaming and the settled shape, group and part React identity now survives the re-slice, so collapse/open state no longer resets. groups whose first part has no id keep their structural key, and duplicate ids fall back to structural keys, so keys stay unique.

## 0.2.13

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

## 0.2.12

### Patch Changes

- Updated dependencies:
  - @assistant-ui/tap@0.6.1

## 0.2.11

### Patch Changes

- [#4271](https://github.com/assistant-ui/assistant-ui/pull/4271) [`2a84174`](https://github.com/assistant-ui/assistant-ui/commit/2a8417422996920c4a58be80eddc1c1740158518) - feat: expose `joinStrategy` on `useAISDKRuntime` / `useChatRuntime` ([@okisdev](https://github.com/okisdev))

  the new AI SDK runtime always merged consecutive `role: "assistant"` UIMessages into a single rendered turn, with no supported way to opt out (the converter accepts `joinStrategy` but the runtime never forwarded it, and `AISDKMessageConverter` is not exported). this follows up on [#1633](https://github.com/assistant-ui/assistant-ui/issues/1633), where the same knob shipped on the legacy `useVercelUseChatRuntime` as `unstable_joinStrategy`. pass `joinStrategy: "none"` to keep proactive or history loaded consecutive assistant messages as separate turns.

  core now exports a shared `JoinStrategy` type so the `"concat-content" | "none"` union has a single source of truth across the converter and the runtimes.

- [#4255](https://github.com/assistant-ui/assistant-ui/pull/4255) [`a0a0769`](https://github.com/assistant-ui/assistant-ui/commit/a0a076915dafdb7152c9fde75b40cfddebcb2676) - feat: check the generative compiler version against the core package compatibility range ([@Yonom](https://github.com/Yonom))

- [#4260](https://github.com/assistant-ui/assistant-ui/pull/4260) [`19c5b5f`](https://github.com/assistant-ui/assistant-ui/commit/19c5b5f3b1616a82ddfa928325c5e02c5786e867) - fix: make defineToolkit usable for plain runtime toolkits ([@Yonom](https://github.com/Yonom))

- [#4246](https://github.com/assistant-ui/assistant-ui/pull/4246) [`dbdfb15`](https://github.com/assistant-ui/assistant-ui/commit/dbdfb15e8b609d3886c71fedb25a9d8345e5fc3c) - feat: message queuing for external-store, langgraph, and local runtimes ([@okisdev](https://github.com/okisdev))

  the composer can now stay usable while a run is in progress: a message sent during a run is held in `composer.queue` (rendered via `ComposerPrimitive.Queue` / `QueueItemPrimitive.*`) and processed once the run settles. external-store adapters opt in by providing a `queue` adapter (typically built with the new `createMessageQueue` helper); `useLangGraphRuntime` and `useLocalRuntime` opt in via `unstable_enableMessageQueue`. `ExternalThreadQueueAdapter` now lives in `@assistant-ui/core` (still re-exported from `@assistant-ui/react`).

- [#4249](https://github.com/assistant-ui/assistant-ui/pull/4249) [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec) - feat: add externalTool for render-only generative toolkit entries ([@Yonom](https://github.com/Yonom))

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4256](https://github.com/assistant-ui/assistant-ui/pull/4256) [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60) - feat: rename hitlTool to humanTool while keeping deprecated compatibility aliases ([@Yonom](https://github.com/Yonom))

- [#4245](https://github.com/assistant-ui/assistant-ui/pull/4245) [`26a365b`](https://github.com/assistant-ui/assistant-ui/commit/26a365bb2b5bf840e21cd0caf1870627fb57c045) - fix: make `SimpleTextAttachmentAdapter` and `SimpleImageAttachmentAdapter` work without `FileReader`. they read files via the browser only `FileReader`, so sending an attachment in a non browser runtime (e.g. `@assistant-ui/react-ink` in a terminal) threw `ReferenceError: FileReader is not defined`. the adapters now feature detect: they keep using `FileReader` when it exists (browser, and React Native whose Blob polyfill provides it) and fall back to `file.text()` / `file.arrayBuffer()` in Node. output is byte identical across all three environments, so `@assistant-ui/react`, `@assistant-ui/react-native`, and `@assistant-ui/react-ink` all keep re-exporting the same core implementation. ([@ShobhitPatra](https://github.com/ShobhitPatra))

- Updated dependencies [[`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc)]:
  - assistant-stream@0.3.21

## 0.2.10

### Patch Changes

- [#4234](https://github.com/assistant-ui/assistant-ui/pull/4234) [`4145caa`](https://github.com/assistant-ui/assistant-ui/commit/4145caaa23452f38c71366b55c03f8ec4da3fd54) - fix: infer `defineToolkit` streamCall argument readers from Standard Schema parameters ([@Yonom](https://github.com/Yonom))

- [#4212](https://github.com/assistant-ui/assistant-ui/pull/4212) [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84) - feat: add MCP server support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4213](https://github.com/assistant-ui/assistant-ui/pull/4213) [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab) - feat: add provider-executed tool support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4208](https://github.com/assistant-ui/assistant-ui/pull/4208) [`0558db2`](https://github.com/assistant-ui/assistant-ui/commit/0558db28952fcd1c05a2ea3f15020cf50ca52489) - feat: add `updateCustom` to thread list runtimes, adapters, and clients ([@okisdev](https://github.com/okisdev))

- [#4214](https://github.com/assistant-ui/assistant-ui/pull/4214) [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46) - feat: add renderText helpers for tool call status text ([@Yonom](https://github.com/Yonom))

- [#4199](https://github.com/assistant-ui/assistant-ui/pull/4199) [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47) - feat: a `defineToolkit` entry may now be an already-formed `ToolDefinition` (carrying its own `type`), not only an inline definition whose `type` the compiler infers. This is what lets a factory like `new JSONGenerativeUI({ library }).present()` be used directly as a tool. ([@Yonom](https://github.com/Yonom))

  Renames the authoring types to match `defineToolkit`: `ToolkitDeclaration` → `ToolkitDefinition`, and adds `ToolkitDefinitionEntry` (the union of an inline tool definition and a pre-formed `ToolDefinition`). The per-tool inline type is now an internal `ToolkitDefinitionInput` and is no longer exported.

- [#4236](https://github.com/assistant-ui/assistant-ui/pull/4236) [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb) - feat: add `stubTool()` and experimental `useAuiToolOverrides()` for locally executed generative toolkit tools ([@Yonom](https://github.com/Yonom))

- [#4235](https://github.com/assistant-ui/assistant-ui/pull/4235) [`7640b31`](https://github.com/assistant-ui/assistant-ui/commit/7640b319f704414bd5eb197f34e11ae0b2324a1d) - Deprecate component tool registration APIs in favor of toolkit registrations. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`cba2b42`](https://github.com/assistant-ui/assistant-ui/commit/cba2b42c26083e730ae07194186ab4473f9f4cf3), [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0), [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb)]:
  - assistant-stream@0.3.20
  - assistant-cloud@0.1.31
  - @assistant-ui/store@0.2.13
  - @assistant-ui/tap@0.5.14

## 0.2.9

### Patch Changes

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: add the `ToolkitDeclaration` / `ToolkitDeclarationDefinition` types for authoring a toolkit permissively (a backend tool may declare `description`/`parameters`/`execute`); the canonical `Toolkit` keeps those fields erased. Author with `defineToolkit()` from `@assistant-ui/react`, which the `"use generative"` compiler strips per build. ([@Yonom](https://github.com/Yonom))

- [#4176](https://github.com/assistant-ui/assistant-ui/pull/4176) [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e) - feat: move the `defineToolkit` and `hitl` use-generative markers from `@assistant-ui/next` into `@assistant-ui/core/react`, so they ship once from every distribution (`@assistant-ui/react`, `@assistant-ui/react-native`, `@assistant-ui/react-ink`) and stay portable across build targets. Import them from `@assistant-ui/react` instead of `@assistant-ui/next`; they remain no-op markers stripped at build time by a `"use generative"` compiler. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e)]:
  - assistant-stream@0.3.19

## 0.2.8

### Patch Changes

- [#4172](https://github.com/assistant-ui/assistant-ui/pull/4172) [`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92) - feat: add the `ToolkitDeclaration` / `ToolkitDeclarationDefinition` types for authoring a toolkit permissively (a backend tool may declare `description`/`parameters`/`execute`); the canonical `Toolkit` keeps those fields erased. Author with `defineToolkit()` from `@assistant-ui/next`, which the `"use generative"` compiler strips per build. ([@Yonom](https://github.com/Yonom))

- [#4151](https://github.com/assistant-ui/assistant-ui/pull/4151) [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3) - chore: drop stale `biome-ignore` pragmas now that the repo lints with oxlint ([@okisdev](https://github.com/okisdev))

- [#4136](https://github.com/assistant-ui/assistant-ui/pull/4136) [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b) - centralize thread-level shared options forwarding across runtime wrapper hooks. follow-up to [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). ([@okisdev](https://github.com/okisdev))

  new public exports from `@assistant-ui/core` (re-exported from `@assistant-ui/react`):
  - `ExternalStoreSharedOptions`, a typed `Pick` over `ExternalStoreAdapter` covering the four thread-level optional fields every wrapper forwards: `isDisabled`, `isSendDisabled`, `unstable_capabilities`, `suggestions`.
  - `pickExternalStoreSharedOptions(options)`, plucks those four fields from a wider options object. the body uses `satisfies Required<...>` so adding a key to the type without copying it in the function is a compile error rather than a silent missing-field bug.
  - `useExternalStoreSharedOptions(options)` (from `@assistant-ui/core/react`), a memoized variant for wrappers that wrap their store in `useMemo`. lets the wrapper list a single stable `shared` reference as a dep instead of enumerating the four fields. same `satisfies` guard internally so the destructure stays in sync with the type.

  internal: every runtime wrapper hook (`useChatRuntime`, `useAISDKRuntime`, `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime`) now uses these helpers instead of inlining the conditional spreads added in [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). each wrapper sheds 20 to 40 lines of duplicated declarations and conditional spreads; future additions to the shared option set propagate through a single edit in `pickExternalStoreSharedOptions` instead of touching every wrapper. no user-facing behavior change.

- [#4160](https://github.com/assistant-ui/assistant-ui/pull/4160) [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b) - feat: add `indicator` support to `MessagePrimitive.GroupedParts`. ([@Yonom](https://github.com/Yonom))

  Restores loading-state handling that was dropped from the grouped renderer. `GroupedParts` now emits a synthetic `{ part: { type: "indicator" } }` render call you handle with `case "indicator"` in your `switch (part.type)` — render a "thinking…" dot or any loading affordance.
  - The indicator is only ever emitted while the message is **running**, so its presence alone means "render loading UI here" — there's no `status` to branch on.
  - New `indicator` prop restricts which running states qualify: `"never"`, `"empty"` (no parts yet), `"no-text"` (default — last part isn't `text`/`reasoning`, e.g. the model ended on a tool call), or `"always"` (any running state).

- [#4161](https://github.com/assistant-ui/assistant-ui/pull/4161) [`76f7d16`](https://github.com/assistant-ui/assistant-ui/commit/76f7d161c2d802b72e07a12f67595f94c9ad7e4d) - perf: memoize the `RuntimeAdapterProvider` context value so adapter consumers no longer re-render on every parent render when `adapters` is stable. ([@Yonom](https://github.com/Yonom))

- [#4162](https://github.com/assistant-ui/assistant-ui/pull/4162) [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe) - fix: drop phantom sibling messages when an external store swaps an optimistic message id mid-run ([#4037](https://github.com/assistant-ui/assistant-ui/issues/4037)). ([@Yonom](https://github.com/Yonom))

  Messages can now be flagged `metadata.isOptimistic`. Optimistic messages are treated as ephemeral: they only ever live on the current head branch (the repository evicts off-branch optimistic messages whenever the head moves) and they are never written to persisted state (`export()` omits them). The AI SDK v6 adapter flags the streaming assistant message as optimistic, so when its client-generated id is replaced by a server-provided one mid-run, the stale placeholder no longer lingers as a phantom branch (e.g. `BranchPicker` showing `2/2` on a turn the user never branched). Unlike the reverted blanket id-diff ([#4040](https://github.com/assistant-ui/assistant-ui/issues/4040)), only explicitly-optimistic messages are affected, so legitimate `onEdit` / `onReload` / `switchToBranch` branches are preserved.

- [#4175](https://github.com/assistant-ui/assistant-ui/pull/4175) [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

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

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d), [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652), [`331f2f7`](https://github.com/assistant-ui/assistant-ui/commit/331f2f7f432285fd0cdc14e0862b550e5d15769e)]:
  - assistant-stream@0.3.18
  - @assistant-ui/store@0.2.13
  - @assistant-ui/tap@0.5.14
  - assistant-cloud@0.1.30

## 0.2.7

### Patch Changes

- [#4121](https://github.com/assistant-ui/assistant-ui/pull/4121) [`7395092`](https://github.com/assistant-ui/assistant-ui/commit/73950929dbebadb275e3bdee23331f65f2635a33) - feat: detect and diagnose duplicate `@assistant-ui/core` installs ([@Yonom](https://github.com/Yonom))
  - In dev mode (`NODE_ENV !== "production"`), `@assistant-ui/core` now emits a single `console.warn` when it detects a second copy of itself loaded into the same JavaScript runtime. Mismatched transitive versions are a common source of subtle bugs (lost tool registrations, broken context lookups, failed `instanceof` checks — see issue [#4101](https://github.com/assistant-ui/assistant-ui/issues/4101)). The warning points users at `npx assistant-ui doctor`.
  - New `assistant-ui doctor` CLI command. It walks `node_modules` recursively (including nested copies), surfaces every duplicate version of any `@assistant-ui/*`, `assistant-stream` or `assistant-cloud` package, queries the npm registry for the latest versions and reports outdated installs. Use `--no-network` to skip the registry check.

- [#4118](https://github.com/assistant-ui/assistant-ui/pull/4118) [`a6e0653`](https://github.com/assistant-ui/assistant-ui/commit/a6e0653bad29fb93627646a77c3383000c57ee33) - feat(core): build a client-side tool-invocations pipeline directly into `useExternalStoreRuntime`. Tool-call parts in messages now fire `streamCall` / `execute` automatically for any external-store runtime that opts in. Opt in per-adapter via `unstable_enableToolInvocations: true` (off by default — most external-store runtimes either run tools server-side or already wire their own client-side dispatch path; double-firing is the risk). The `_store.isLoading` flag signals when initial history is loaded: snapshots observed while `isLoading === true` are treated as historical (no fire), matching the contract that callers like `importExternalState` already rely on. Six in-tree runtimes (`useAssistantTransportRuntime`, `useAISDKRuntime`, `useLangGraphRuntime`, `useStreamRuntime`, `useAgUiRuntime`, `useAdkRuntime`) are migrated to the embedded tracker; the standalone `useToolInvocations` React hook is removed. Adds `ExternalStoreAdapter.setToolStatuses` so adapters can mirror the tracker's per-tool-call status into local React state for converter metadata. Auto-aborts in-flight tool calls on new turns (`append()` with `startRun`, `startRun()`) so a tool that finishes after the user moves on can no longer feed a stale result into the next turn. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`cabfc71`](https://github.com/assistant-ui/assistant-ui/commit/cabfc715e99f23a55dc1276a6028792d7ecad822)]:
  - @assistant-ui/tap@0.5.13
  - @assistant-ui/store@0.2.12

## 0.2.6

### Patch Changes

- [#4120](https://github.com/assistant-ui/assistant-ui/pull/4120) [`372d4f0`](https://github.com/assistant-ui/assistant-ui/commit/372d4f0c538a766fd9a849fef74e413dde86d74a) - feat: simplify `MessagePrimitive.GroupedParts` API and add `groupPartByType` helper. ([@Yonom](https://github.com/Yonom))
  - New `groupPartByType({ ... })` helper builds a `groupBy` from a `part.type → group-key path` lookup. The map keys are typed against `PartState["type"]` (autocomplete + typo rejection), missing keys leave the part ungrouped, and the returned function carries an internal memo fingerprint so the tree survives unrelated re-renders even when reconstructed inline.
  - Special map key `"mcp-app"` matches tool-call parts that point at an assistant-ui MCP app resource (`ui://...`). It takes precedence over the `"tool-call"` entry for those parts, so MCP apps can be routed separately (e.g. rendered outside a chain-of-thought wrapper).
  - `groupBy` signature simplified from `(part, index, parts) => string | string[] | null | undefined` to `(part) => readonly \`group-${string}\`[] | null`. The 2nd/3rd args were unused in practice. Arrays are required (no bare-string shorthand); `null`is accepted as an alias for`[]` to soften the migration.
  - Internal memoization now uses the helper's memo fingerprint when present, otherwise rebuilds the tree per render (O(n), cheap). The previous "pass a stable reference" advice is dropped — inline `groupBy` is fine.
  - Docs and examples updated to lead with `groupPartByType`. The `getMcpAppFromToolPart` branch in `packages/ui` switches to `"mcp-app": []` via the helper.

- [#4107](https://github.com/assistant-ui/assistant-ui/pull/4107) [`32ae846`](https://github.com/assistant-ui/assistant-ui/commit/32ae846a91b61eccd01330693868a48f2f3bb0c4) - feat: surface AI SDK v6 tool approvals as a first-class `respondToApproval` prop on tool components. tool-call parts in the `approval-requested` state now carry `part.approval = { id, isAutomatic? }`; tool components call `respondToApproval({ approved, reason? })` to ack the gate without threading `chatHelpers` through application context. also fixes a transient `requires-action` flicker for the `approval-responded` state and tightens the external-message converter so interrupt vs pending tool calls are distinguished by an actual `interrupt`/`approval` field rather than by `result === undefined`. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`d4f1db4`](https://github.com/assistant-ui/assistant-ui/commit/d4f1db428b1a1fe5c122150e1e366a377e9adb5f)]:
  - assistant-stream@0.3.17

## 0.2.5

### Patch Changes

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

- [#3651](https://github.com/assistant-ui/assistant-ui/pull/3651) [`6a0ecb2`](https://github.com/assistant-ui/assistant-ui/commit/6a0ecb2e49f24c5f066052018db5a9f1411dcc59) - feat(react-ink): add file storage adapter ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4072](https://github.com/assistant-ui/assistant-ui/pull/4072) [`e4634a5`](https://github.com/assistant-ui/assistant-ui/commit/e4634a59b7a926d158e929d559326f243efe438b) - fix(core): replay the latched `initialize` thread event to late subscribers. `ensureInitialized` emits `initialize` once during construction, so a runtime seeded with non-empty `messages` (e.g. `useChatRuntime({ messages })` under `useRemoteThreadListRuntime`) fired it before the title binder's effect subscribed, and the `runEnd` → `generateTitle` wiring was never installed. `unstable_on("initialize", ...)` now schedules a one-off replay (on a microtask, re-checking the subscription) when the thread has already initialized, mirroring a BehaviorSubject, so late subscribers (the title binder, and `ThreadViewport`'s `thread.initialize` top-anchor reset) no longer miss it. ([@okisdev](https://github.com/okisdev))

- [#3867](https://github.com/assistant-ui/assistant-ui/pull/3867) [`325de4c`](https://github.com/assistant-ui/assistant-ui/commit/325de4c73b348d4c20dafa4a2ac6d436c69dbf28) - relax `thread-message-like` image validation to accept `https://` and `blob:` URLs (and `svg+xml` data URIs) alongside base64 `data:` URIs, so assistant-authored images served from a URL render. ([@samdickson22](https://github.com/samdickson22))

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

- Updated dependencies [[`13a12c4`](https://github.com/assistant-ui/assistant-ui/commit/13a12c46c94f7e5e62af02692cf3479fff48bd02), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0)]:
  - assistant-stream@0.3.16
  - assistant-cloud@0.1.29
  - @assistant-ui/store@0.2.12
  - @assistant-ui/tap@0.5.12

## 0.2.4

### Patch Changes

- [#4077](https://github.com/assistant-ui/assistant-ui/pull/4077) [`221d320`](https://github.com/assistant-ui/assistant-ui/commit/221d320cee987a4cd464c9cbae152d918197499e) - fix(core|MessageParts,GroupedParts): key part fibers by absolute part index ([@Yonom](https://github.com/Yonom))

  Inside `MessagePrimitive.GroupedParts` and the auto-grouped
  `toolGroup` / `reasoningGroup` ranges of `MessagePrimitive.Parts`,
  leaf fibers were keyed by their **structural position** in the
  group tree rather than by the underlying part's absolute index.
  When the parts list reshaped (e.g., a thread switch with a
  different group layout), React reused the same fiber at a given
  structural slot but with a different `index` prop, keeping the
  prior tap subscription alive against an index that may now point
  at a different part or be out of range — surfacing as
  `tapClientLookup: Index N out of bounds` or
  `MessagePartText can only be used inside text or reasoning message
parts`. Keying by part index instead causes React to unmount the
  fiber when the part underneath actually changes.

## 0.2.3

### Patch Changes

- [#4023](https://github.com/assistant-ui/assistant-ui/pull/4023) [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33) - docs: add JSDoc for core runtime and assistant tool APIs ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#3513](https://github.com/assistant-ui/assistant-ui/pull/3513) [`8b6fc88`](https://github.com/assistant-ui/assistant-ui/commit/8b6fc8836871e62efc2fd8c131c6783e12c5fc47) - fix: guard `navigator.clipboard` availability and swallow write rejections in `ActionBarPrimitive.Copy`. Previously, copy clicks in SSR, non-HTTPS contexts, or older browsers without the Clipboard API threw a `ReferenceError`, and permission-denied rejections surfaced as unhandled promise rejections. The web copyToClipboard implementation in `@assistant-ui/react` now early-rejects when the API is unavailable, and `useActionBarCopy` in `@assistant-ui/core` silently absorbs the rejection so the rest of the UI is unaffected. ([@JustAnOkapi](https://github.com/JustAnOkapi))

- [#4057](https://github.com/assistant-ui/assistant-ui/pull/4057) [`179895f`](https://github.com/assistant-ui/assistant-ui/commit/179895fdcb56edee2e8d9efb4b38cd3859eeecdd) - fix(core): fire `streamCall` for already-resolved tool calls observed after the initial snapshot, and promote in-progress tool calls from the initial snapshot once they change. Previously the runtime silently skipped `streamCall` whenever a tool-call part arrived already-resolved (history reload, thread switch, mid-run resume, PTC sub-call surfacing), forcing fragile render-effect fallbacks. `execute` stays suppressed for these cases so side effects don't double-run. ([@Yonom](https://github.com/Yonom))

  Also collapses the per-tool-call ref soup inside `useToolInvocations` into a single discriminated `ToolCallEntry` map keyed by logical tool-call id, with execution-lifecycle bookkeeping tracked separately by physical stream id. Removes `ignoredToolIds`, `lastToolStates`, `toolCallIdAliasesRef` identity entries, the parallel `restoredSignaturesRef`/`preResolvedToolCallIdsRef`/`startedExecutionToolCallIdsRef` sets, and the early-return that suppressed `streamCall` for already-resolved tool calls. `reset()` semantics are unchanged; integrators that already call `reset()` on history reload don't need to change.

- [#3958](https://github.com/assistant-ui/assistant-ui/pull/3958) [`7a8bf26`](https://github.com/assistant-ui/assistant-ui/commit/7a8bf26eda76f5f8490f96b3ff9dce1ccd072917) - refactor: hoist `MessagePartPrimitiveInProgress` to `@assistant-ui/core/react` so `@assistant-ui/react`, `@assistant-ui/react-ink`, and other distributions can share the same implementation. `@assistant-ui/react`'s `MessagePartPrimitive.InProgress` is unchanged for callers; it now re-exports from core. ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3636](https://github.com/assistant-ui/assistant-ui/pull/3636) [`3b2bbce`](https://github.com/assistant-ui/assistant-ui/commit/3b2bbce1589b44a13b8b7a570c19bf35a2266fbd) - feat(core): expose modelName and toolNames in ModelContextState ([@ShobhitPatra](https://github.com/ShobhitPatra))

- Updated dependencies [[`845c7c1`](https://github.com/assistant-ui/assistant-ui/commit/845c7c12fecbb448da7f1135c33163b653a50710), [`db721df`](https://github.com/assistant-ui/assistant-ui/commit/db721df32434296ac14eab27030628107975b71c), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33)]:
  - assistant-cloud@0.1.28
  - @assistant-ui/store@0.2.11
  - assistant-stream@0.3.15
  - @assistant-ui/tap@0.5.11

## 0.2.2

### Patch Changes

- [#4024](https://github.com/assistant-ui/assistant-ui/pull/4024) [`19d4d94`](https://github.com/assistant-ui/assistant-ui/commit/19d4d9412234628ae850b4b04da594201022a398) - feat: add native MCP Apps renderer — `McpAppRenderer` composes into `Tools` to render MCP UI resources inline in chat over a JSON-RPC postMessage bridge on `SafeContentFrame`. Adds an `mcp` field to `ToolCallMessagePart` and forwards `callProviderMetadata.mcp.app` through the AI SDK message converter. ([@Yonom](https://github.com/Yonom))

## 0.2.1

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

- [#3972](https://github.com/assistant-ui/assistant-ui/pull/3972) [`c9dd16c`](https://github.com/assistant-ui/assistant-ui/commit/c9dd16c4b1edc52f6a2529a9a07ebb7964aee9a1) - fix: `useExternalStoreRuntime` no longer crashes with "Entry not available in the store" when the adapter sets `threadId` to a value that isn't present in `threads`/`archivedThreads`. The runtime now synthesizes a regular thread item for `mainThreadId`, so thin adapters (e.g. `useAgUiRuntime`) that only expose `threadId` resolve correctly on first render and after switching threads. Closes [#3971](https://github.com/assistant-ui/assistant-ui/issues/3971). ([@okisdev](https://github.com/okisdev))

- [#3674](https://github.com/assistant-ui/assistant-ui/pull/3674) [`dea8bc7`](https://github.com/assistant-ui/assistant-ui/commit/dea8bc7e122ad6ff53e48e6b0ffc6fcc2abaadd3) - fix(core): guard MessagePrimitive.Attachments against missing user message attachments ([@cewinharhar](https://github.com/cewinharhar))

- [#3634](https://github.com/assistant-ui/assistant-ui/pull/3634) [`9c3d24d`](https://github.com/assistant-ui/assistant-ui/commit/9c3d24d8a358bcf5f683f85473b82524ea018930) - Support AI SDK `source-document` parts by preserving them as assistant-ui ([@sicko7947](https://github.com/sicko7947))
  document source message parts across conversion and cloud serialization,
  including the legacy React cloud encoder.
- Updated dependencies [[`9ecda1d`](https://github.com/assistant-ui/assistant-ui/commit/9ecda1dfdd96f2c638e7b51cc951319ccacd06c9), [`fa4510a`](https://github.com/assistant-ui/assistant-ui/commit/fa4510a3f3a23e0458ce8f3a397c352e3b0cde07)]:
  - assistant-stream@0.3.14

## 0.2.0

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

## 0.1.18

### Patch Changes

- [#3953](https://github.com/assistant-ui/assistant-ui/pull/3953) [`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6) - Add cursor-based pagination to the thread list. `RemoteThreadListAdapter.list()` accepts an optional `{ after }` cursor and may return `nextCursor` on the response. The runtime exposes `loadMore()`, `hasMore`, and `isLoadingMore` through both the legacy `ThreadListRuntime` API and the tap-only `aui.threads()` path; `ThreadListRuntimeCore.loadMore?()`, `hasMore?`, and `isLoadingMore?` are optional, so non-paginating cores (local, external-store, single-thread, in-memory) remain conformant. ([@okisdev](https://github.com/okisdev))

  `@assistant-ui/react` ships a matching `ThreadListPrimitive.LoadMore` button built on `createActionButton`, plus a `useThreadListLoadMore` primitive hook. Consumers wanting an `IntersectionObserver` sentinel can read `s.threads.hasMore` / `isLoadingMore` from `useAuiState` and call `aui.threads().loadMore()` directly.

  In-flight `loadMore()` calls dedup via a single promise. The existing `_loadGeneration` counter drops stale append callbacks when a `reload()` interleaves a `loadMore()`. The loadMore reducer captures the active adapter so a mid-flight adapter swap cannot leak a stale page. Empty-string `nextCursor` is normalised to `undefined`. `reload()` pre-clears the cursor so consumers reading `hasMore` directly during a reload do not observe a stale value.

  Adapter rejections are surfaced via `console.error` in both the initial-load and `loadMore` paths, matching the pattern in `RemoteThreadListHookInstanceManager` and `useToolInvocations`.

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94), [`5fdf17e`](https://github.com/assistant-ui/assistant-ui/commit/5fdf17e019c91b000c6f4cf9e3e56c89d764a435)]:
  - assistant-stream@0.3.13
  - @assistant-ui/store@0.2.10
  - @assistant-ui/tap@0.5.11
  - assistant-cloud@0.1.27

## 0.1.17

### Patch Changes

- [#3916](https://github.com/assistant-ui/assistant-ui/pull/3916) [`0bbf5dd`](https://github.com/assistant-ui/assistant-ui/commit/0bbf5dd7357c0993958a2e8e55eb60705eca3207) - chore: drop `./*` wildcard export and surface internal attachment status types ([@Yonom](https://github.com/Yonom))

  The `./*` wildcard in `exports` was exposing the entire dist tree as importable subpaths, which inadvertently leaked internal modules (e.g. `@assistant-ui/core/tests/*`, `@assistant-ui/core/types/*`) as public API. Removing it.

  Two attachment status types that were previously only reachable through the wildcard (`PendingAttachmentStatus`, `CompleteAttachmentStatus`) are now re-exported from the package root so that consumers' inferred types remain portable.

- [#3917](https://github.com/assistant-ui/assistant-ui/pull/3917) [`98f165c`](https://github.com/assistant-ui/assistant-ui/commit/98f165ca83c4df9b9133eb4ce4fdf8c7a06886bb) - feat: enrich `composer.attachmentAddError` event with typed payload ([@okisdev](https://github.com/okisdev))

  The event now carries `{ reason, message, attachmentId?, error? }` so subscribers can branch on the failure mode (`no-adapter` / `not-accepted` / `adapter-error`). The bridge no longer relies on a `findLast` heuristic to recover the failed attachment id.

  Several state-derivable events are now annotated `@deprecated` because they duplicate state observation: `composer.send`, `composer.attachmentAdd`, `thread.runStart`, `thread.runEnd`, `thread.initialize`, `threadListItem.switchedTo`, `threadListItem.switchedAway`. They continue to fire for backward compatibility; new code should observe state via `useAuiState` instead.

- [#3914](https://github.com/assistant-ui/assistant-ui/pull/3914) [`62ec5bd`](https://github.com/assistant-ui/assistant-ui/commit/62ec5bd3368fb69ea7bcde275858e0ea8fa1d59b) - fix: add typesVersions to support moduleResolution: node ([@shashank-100](https://github.com/shashank-100))

  Users with `moduleResolution: node` in their tsconfig were seeing `Property 'message' does not exist on type 'AssistantState'` because the `exports` map sub-paths (e.g. `@assistant-ui/core/react`) are ignored by legacy node module resolution. Adding `typesVersions` makes TypeScript resolve sub-path types correctly under all moduleResolution modes.

- [#3853](https://github.com/assistant-ui/assistant-ui/pull/3853) [`6a919c1`](https://github.com/assistant-ui/assistant-ui/commit/6a919c1fa21113080f46dd0e08142c939dad3ea4) - feat: add `<MessagePrimitive.GroupedParts>` for hierarchical adjacent grouping of message parts ([@Yonom](https://github.com/Yonom))

  Introduces a new primitive that coalesces adjacent parts into groups via a user-supplied `groupBy(part) → "group-…" | readonly "group-…"[] | null`. Adjacent parts sharing a key-path prefix coalesce up to that prefix; ungrouped parts render as direct leaves.

  The render function takes `{ part, children }` and dispatches on a single `switch (part.type)`. `"group-…"` cases wrap `children` (the recursively-rendered subtree); real part types (`"text"`, `"tool-call"`, `"reasoning"`, …) render the part directly with the same `EnrichedPartState` enrichments (`toolUI`, `addResult`, `resume`, `dataRendererUI`) that `<MessagePrimitive.Parts>` provides.

  `GroupPart` is intentionally minimal: `{ type, status, indices }`. The render function is invoked once per group node and once per individual leaf part, so users never have to nest a `<MessagePrimitive.Parts>` call.

  The `groupBy` return type is constrained to `` `group-${string}` `` so the unified switch can never collide with a real part type. The component infers a literal `TKey` per call site, so `part.type` narrows to the exact union of group keys plus part types.

  For leaf parts, `children` is a sentinel that throws if rendered — accidental fall-through like `default: return children;` errors loudly instead of silently rendering nothing. Returning `null` from a leaf case is fine.

  Deprecates the legacy `components.ToolGroup`, `components.ReasoningGroup`, and `components.ChainOfThought` props on `<Parts>`, and `<MessagePrimitive.Unstable_PartsGrouped>` for adjacent grouping — all still work for backwards compatibility.

## 0.1.16

### Patch Changes

- [#3895](https://github.com/assistant-ui/assistant-ui/pull/3895) [`549037a`](https://github.com/assistant-ui/assistant-ui/commit/549037ac77aed8736823cfb82baf9645e3364adf) - fix(core): emit attachmentAddError when no adapter is configured or file type is rejected ([@okisdev](https://github.com/okisdev))

- [#3896](https://github.com/assistant-ui/assistant-ui/pull/3896) [`976aec5`](https://github.com/assistant-ui/assistant-ui/commit/976aec566330bee3c607cfb356f3358eefe28ac1) - fix(core): respect `adapter.accept` when adding external `CreateAttachment` ([@okisdev](https://github.com/okisdev))

  `composer.addAttachment` previously bypassed the configured `AttachmentAdapter` for `CreateAttachment` descriptors, including the `adapter.accept` content-type check. It now validates the descriptor's `contentType` (or filename extension) against `adapter.accept` when an adapter is configured, throwing and emitting `composer.attachmentAddError` on mismatch. Without an adapter, external attachments are still added as-is, preserving the existing "no adapter required" guarantee for external sources.

- [#3716](https://github.com/assistant-ui/assistant-ui/pull/3716) [`25b97d5`](https://github.com/assistant-ui/assistant-ui/commit/25b97d5c62fb038471b06eaa784ad4b7e23ef533) - fix(core): show loading state for empty parts children API ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3891](https://github.com/assistant-ui/assistant-ui/pull/3891) [`2008fc9`](https://github.com/assistant-ui/assistant-ui/commit/2008fc9af3d6fe05604d6b08275c2e9cec099bd9) - fix(core): hoist remote thread runtime binder out of `unstable_Provider` ([@okisdev](https://github.com/okisdev))

  `RemoteThreadListAdapter.unstable_Provider` is now allowed to render any subtree it likes; the runtime binding (composer state, `__internal_setGetInitializePromise`, `runEnd → generateTitle` listener) executes outside it. This fixes `EMPTY_THREAD_ERROR` when the Provider defers `children` (e.g. behind a history-loading state) and avoids the history-switch regression seen when only the binder, but not the init listeners, were hoisted. Adds a dev-mode warning when the Provider does not render `children` within ~100ms.

- [#3889](https://github.com/assistant-ui/assistant-ui/pull/3889) [`88fcd35`](https://github.com/assistant-ui/assistant-ui/commit/88fcd352ecffd12f124abe988cc5499f784f81d6) - feat: add `custom` slot to `RemoteThreadMetadata` and `ThreadListItemState` ([@okisdev](https://github.com/okisdev))

  allows adapter authors to carry arbitrary backend session data through `list()` / `fetch()` and surface it on the thread list item state. matches the existing `custom: Record<string, unknown>` convention used on `ThreadMessage`, `RunConfig`, and `ChatModelRunResult`. consumers can intersect a typed shape at their own boundary, e.g. `RemoteThreadMetadata & { custom: { workspaceId: string } }`.

- Updated dependencies [[`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e)]:
  - @assistant-ui/store@0.2.9
  - @assistant-ui/tap@0.5.10

## 0.1.15

### Patch Changes

- [#3857](https://github.com/assistant-ui/assistant-ui/pull/3857) [`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e) - fix(core): edit composer no longer re-injects original file parts when user message attachments are modified. Non-text content parts on user messages are lifted into `_attachments` so attachment removals take effect and files aren't duplicated on resend; non-user messages keep the existing content pass-through. ([@okisdev](https://github.com/okisdev))

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3796](https://github.com/assistant-ui/assistant-ui/pull/3796) [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836) - feat(react-langgraph): add uiComponents option for static and dynamic data renderers ([@ShobhitPatra](https://github.com/ShobhitPatra))

  Add `uiComponents` option to `useLangGraphRuntime` for registering static data renderers by name and a `fallback` renderer for dynamic loading (e.g. LangSmith's `LoadExternalComponent`), directly from the runtime hook.

  Core `DataRenderers` scope also gains a `fallbacks` stack (plus `setFallbackDataUI` method) that the adapter registers into; resolution is `renderers[name][0]` → `fallbacks[0]` → inline `Fallback`.

- [#3873](https://github.com/assistant-ui/assistant-ui/pull/3873) [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a) - feat(core): add `reload()` method on `ThreadListRuntime` and `aui.threads()` that re-invokes the remote adapter's `list()` and refreshes the thread list. Use this after asynchronous auth (e.g. OIDC, better-auth) completes to recover from an initial load that ran before the authenticated user was available. A generation counter ensures a mid-flight response from a superseded load cannot overwrite a newer reload's state. ([@okisdev](https://github.com/okisdev))

- [#3855](https://github.com/assistant-ui/assistant-ui/pull/3855) [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c) - fix: `useExternalStoreRuntime` now correctly initializes `mainThreadId`, `threadIds`, and `archivedThreadIds` from the adapter on first render. Previously they stayed at `DEFAULT_THREAD_ID` until the user switched threads, so `isMain` was `false` on initial load. Closes [#2577](https://github.com/assistant-ui/assistant-ui/issues/2577). ([@okisdev](https://github.com/okisdev))

- [#3859](https://github.com/assistant-ui/assistant-ui/pull/3859) [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568) - fix(core): `switchToThread` could duplicate a thread or leave it in both `threadIds` and `archivedThreadIds` when it raced with `list()`. Both arrays are now filtered before the status-keyed append, matching the `updateStatusReducer` pattern. ([@bilaltahseen](https://github.com/bilaltahseen))

- [#3858](https://github.com/assistant-ui/assistant-ui/pull/3858) [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1) - fix: `useAISDKRuntime` now throws when the supplied `ThreadHistoryAdapter` omits `withFormat`, instead of silently dropping all history load/append/update calls. The optional-call chain `historyAdapter.withFormat?.(…).load()` previously short-circuited to `undefined`. The `withFormat`-wrapped adapter is now memoized, and the persist effect short-circuits when no adapter is supplied (avoiding a redundant thread subscription). `ThreadHistoryAdapter.withFormat` gains a JSDoc note clarifying that it is required on the AI SDK path. ([@okisdev](https://github.com/okisdev))

- [#3831](https://github.com/assistant-ui/assistant-ui/pull/3831) [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063) - chore: remove decorative separator comments across packages ([@okisdev](https://github.com/okisdev))

- [#3872](https://github.com/assistant-ui/assistant-ui/pull/3872) [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c) - feat(core): let runtimes provide an explicit `isRunning` that overrides the last-message-status heuristic. `ExternalStoreAdapter.isRunning` now flows through to `thread.isRunning` directly, so applications can keep the thread in a running state even after the last assistant message has completed (e.g. while non-message stream chunks like suggestions, step-finish, or metadata updates are still arriving). When a runtime does not provide `isRunning`, the previous last-message-based behavior is preserved. ([@okisdev](https://github.com/okisdev))

- [#3834](https://github.com/assistant-ui/assistant-ui/pull/3834) [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd) - refactor: unify mention/slash under behavior sub-primitives; delete Mention/SlashCommand aliases and the `execute` field on `Unstable_TriggerItem`; split TriggerPopoverResource; rename react-lexical `MentionNode`/`MentionPlugin`/`MentionChipProvider`/`mentionChip` prop to `DirectiveNode`/`DirectivePlugin`/`DirectiveChipProvider`/`directiveChip`; fix IME/Unicode/copy-paste/undo bugs. Breaking (`Unstable_` APIs): replace `onSelect={{type:"insertDirective",formatter}}` with `<Unstable_TriggerPopover.Directive formatter={...}>`; replace `onSelect={{type:"action",handler}}` with `<Unstable_TriggerPopover.Action onExecute={...}>`. Rename `unstable_useToolMentionAdapter` → `unstable_useMentionAdapter` with new `items`/`categories`/`includeModelContextTools` options. `unstable_useSlashCommandAdapter` now returns `{ adapter, action }` — `execute` stays in the hook closure instead of on the item. Rename CSS class `aui-mention-chip` → `aui-directive-chip` and attributes `data-mention-*` → `data-directive-*`. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`055dda5`](https://github.com/assistant-ui/assistant-ui/commit/055dda54b68031d0c9c760bf89a7c1036dd2174d), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063)]:
  - assistant-stream@0.3.12
  - assistant-cloud@0.1.27
  - @assistant-ui/store@0.2.8
  - @assistant-ui/tap@0.5.9

## 0.1.14

### Patch Changes

- f20b9ca: feat: add ExportedMessageRepository.fromBranchableArray() for constructing branching message trees from ThreadMessageLike messages
- c988db8: chore: update dependencies
- Updated dependencies [c988db8]
  - assistant-stream@0.3.11
  - assistant-cloud@0.1.26
  - @assistant-ui/store@0.2.7
  - @assistant-ui/tap@0.5.8

## 0.1.13

### Patch Changes

- 42bc640: feat: support edit lineage and startRun in EditComposer send flow
  - Add `SendOptions` with `startRun` flag to `composer.send()`
  - Expose `parentId` and `sourceId` on `EditComposerState`
  - Add `EditComposerRuntimeCore` interface extending `ComposerRuntimeCore`
  - Bypass text-unchanged guard when `startRun` is explicitly set
  - `ComposerSendOptions` extends `SendOptions` for consistent layering

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

- Updated dependencies [376bb00]
  - assistant-cloud@0.1.25
  - @assistant-ui/tap@0.5.7
  - @assistant-ui/store@0.2.6

## 0.1.12

### Patch Changes

- 19b1024: fix(core): move initialThreadId/threadId handling from constructor to \_\_internal_load to prevent SSR crash

## 0.1.11

### Patch Changes

- de29641: fix(core): start RemoteThreadList isLoading as true
- a8bf84b: feat(core): expose `getLoadThreadsPromise()` on `ThreadListRuntime` public API
- 5fd5c3d: feat(core): add reactive `threadId` option to `useRemoteThreadListRuntime` for URL-based routing
- ec50e8a: fix(core): prevent resolved history tool calls from re-executing
- Updated dependencies [2c5cd97]
  - assistant-stream@0.3.10

## 0.1.10

### Patch Changes

- 6554892: feat: add useAssistantContext for dynamic context injection

  Register a callback-based context provider that injects computed text into the system prompt at evaluation time, ensuring the prompt always reflects current application state.

- 9103282: fix: resolve biome lint warnings (optional chaining, unused suppressions)
- 876f75d: feat: add interactable state persistence

  Add persistence API to interactables with exportState/importState, debounced setPersistenceAdapter, per-id isPending/error tracking, flush() for immediate sync, and auto-flush on component unregister.

- bdce66f: chore: update dependencies
- 4abb898: refactor: align interactables with codebase conventions
  - Rename `useInteractable` to `useAssistantInteractable` (registration only, returns id)
  - Add `useInteractableState` hook for reading/writing interactable state
  - Remove `makeInteractable` and related types
  - Rename `UseInteractableConfig` to `AssistantInteractableProps`
  - Extract `buildInteractableModelContext` from `Interactables` resource
  - Add `with-interactables` example to CLI

- 209ae81: chore: remove aui-source export condition from package.json exports
- af70d7f: feat: add useToolArgsStatus hook for per-prop streaming status

  Add a convenience hook that derives per-property streaming completion status from tool call args using structural partial JSON analysis.

- Updated dependencies [dffb6b4]
- Updated dependencies [9103282]
- Updated dependencies [bdce66f]
- Updated dependencies [209ae81]
- Updated dependencies [2dd0c9f]
  - assistant-stream@0.3.9
  - assistant-cloud@0.1.24
  - @assistant-ui/store@0.2.6
  - @assistant-ui/tap@0.5.6

## 0.1.9

### Patch Changes

- 781f28d: feat: accept all file types and validate against adapter's accept constraint
- 3227e71: feat: add interactables with partial updates, multi-instance, and selection
  - `useInteractable(name, config)` hook and `makeInteractable` factory for registering AI-controllable UI
  - `Interactables()` scope resource with auto-generated update tools and system prompt injection
  - Partial updates — auto-generated tools use partial schemas so AI only sends changed fields
  - Multi-instance support — same name with different IDs get separate `update_{name}_{id}` tools
  - Selection — `setSelected(true)` marks an interactable as focused, surfaced as `(SELECTED)` in system prompt

- 0f55ce8: fix(core): hide phantom empty bubble when user message has no text content
- 83a15f7: feat(core): stream interactable state updates as tool args arrive
- 52403c3: chore: update dependencies
- ffa3a0f: feat(core): add attachmentAddError composer event
- Updated dependencies [3227e71]
- Updated dependencies [52403c3]
  - assistant-stream@0.3.8
  - assistant-cloud@0.1.23
  - @assistant-ui/store@0.2.5
  - @assistant-ui/tap@0.5.5

## 0.1.8

### Patch Changes

- 1406aed: fix(core): prevent stale list() response from undoing concurrent delete/archive/unarchive in OptimisticState
- 9480f30: fix(core): stop thread runtime on delete to prevent store crash
- 28a987a: feat: SingleThreadList resource
  refactor: attachTransformScopes should mutate the scopes instead of cloning it
- 736344c: chore: update dependencies
- ff3be2a: Add @-mention system with cursor-aware trigger detection, keyboard navigation, search, and Lexical rich editor support
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

- Updated dependencies [28a987a]
- Updated dependencies [736344c]
- Updated dependencies [c71cb58]
  - @assistant-ui/store@0.2.4
  - assistant-stream@0.3.7
  - @assistant-ui/tap@0.5.4

## 0.1.7

### Patch Changes

- 7ecc497: feat: children API for primitives with part.toolUI, part.dataRendererUI, and MessagePrimitive.Quote

## 0.1.6

### Patch Changes

- 1ed9867: feat: move resumeRun to stable
- 427ffaa: refactor: drop all barrel files
- 349f3c7: chore: update deps
- 02614aa: feat: add multi-agent support
  - `ReadonlyThreadProvider` and `MessagePartPrimitive.Messages` for rendering sub-agent messages
  - `assistant-stream`: add `messages` field to `tool-result` chunks, `ToolResponseLike`, and `ToolCallPart` types, enabling sub-agent messages to flow through the streaming protocol

- 6cc4122: refactor: use primitive hooks
- 642bcda: Add `quote.tsx` registry components and `injectQuoteContext` helper
- Updated dependencies [427ffaa]
- Updated dependencies [349f3c7]
- Updated dependencies [02614aa]
  - assistant-stream@0.3.6
  - assistant-cloud@0.1.22
  - @assistant-ui/store@0.2.3
  - @assistant-ui/tap@0.5.3

## 0.1.5

### Patch Changes

- 990e41d: refactor: code sharing between the multiple platforms

## 0.1.4

### Patch Changes

- f032ea5: fix: restore `typeof process` runtime guard in useCloudThreadListAdapter
- Updated dependencies [2828b67]
  - assistant-stream@0.3.5

## 0.1.3

### Patch Changes

- 5ae74fe: fix: prevent double-submit when ComposerPrimitive.Send child has type="submit"
- 8ed9d6f: Refactor React Native component API: move shared runtime logic (remote thread list, external store, cloud adapters, message converter, tool invocations) into @assistant-ui/core for reuse across React and React Native
- 01bee2b: Remove zod dependency by using assistant-stream's toJSONSchema utility for schema serialization in AssistantFrameProvider

## 0.1.2

### Patch Changes

- 03714af: fix: DataRenderers not in scope

## 0.1.1

### Patch Changes

- a638f05: refactor(core): depend on @assistant-ui/store, register chat scopes via module augmentation
- 28f39fe: Support custom content types via `data-*` prefix in ThreadMessageLike (auto-converted to DataMessagePart), widen `BaseAttachment.type` to accept custom strings, make `contentType` optional
- 36ef3a2: chore: update dependencies
- 6692226: feat: support external source attachments in composer

  `addAttachment()` now accepts either a `File` or a `CreateAttachment` descriptor, allowing users to add attachments from external sources (URLs, API data, CMS references) without creating dummy `File` objects or requiring an `AttachmentAdapter`.

- c31c0fa: Extract shared React code (model-context, client, types, providers, RuntimeAdapter) into `@assistant-ui/core/react` sub-path so both `@assistant-ui/react` and `@assistant-ui/react-native` re-export from one source.
- fc98475: feat(core): move `@assistant-ui/tap` to peerDependencies to fix npm deduplication
- 374f83a: fix(core): stabilize object references in ExternalStoreThreadRuntimeCore to prevent infinite re-render loop
- 1672be8: feat: bindExternalStoreMessage
- 14769af: refactor: move RuntimeAdapter base logic to @assistant-ui/core; re-export missing core APIs from distribution packages
- Updated dependencies [36ef3a2]
- Updated dependencies [fc98475]
- Updated dependencies [a638f05]
  - assistant-stream@0.3.4
  - @assistant-ui/store@0.2.1
  - @assistant-ui/tap@0.5.1

## 0.1.0

### Minor Changes

- 60bbe53: feat(core): ready for release

### Patch Changes

- 546c053: feat(core): extract subscribable, utils, and model-context; add public/internal API split
- a7039e3: feat(core): extract remote-thread-list and assistant-transport utilities to @assistant-ui/core
- 16c10fd: feat(core): extract runtime and adapters to @assistant-ui/core
- 40a67b6: feat(core): add message, attachment, and utility type definitions
- b181803: feat(core): introduce @assistant-ui/core package

  Extract framework-agnostic core from @assistant-ui/react. Replace React ComponentType references with framework-agnostic types and decouple AssistantToolProps/AssistantInstructionsConfig from React hook files.

- 4d7f712: feat(core): move runtime-to-client bridge to core/store for framework reuse
- ecc29ec: feat(core): move scope types and client implementations to @assistant-ui/core/store
- 6e97999: feat(core): move store tap infrastructure to @assistant-ui/core/store
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
- Updated dependencies [6bd6419]
- Updated dependencies [b65428e]
- Updated dependencies [61b54e9]
- Updated dependencies [b65428e]
- Updated dependencies [93910bd]
- Updated dependencies [b65428e]
  - @assistant-ui/tap@0.5.0
  - assistant-stream@0.3.3
