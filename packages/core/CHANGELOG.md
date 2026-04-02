# @assistant-ui/core

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
