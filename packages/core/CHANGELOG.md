# @assistant-ui/core

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
