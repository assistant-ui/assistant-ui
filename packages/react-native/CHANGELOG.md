# @assistant-ui/react-native

## 0.1.11

### Patch Changes

- 0d2d2f3: fix: export ExportedMessageRepository and ExportedMessageRepositoryItem from react-native
- c988db8: chore: update dependencies
- Updated dependencies [f20b9ca]
- Updated dependencies [c988db8]
  - @assistant-ui/core@0.1.14
  - assistant-stream@0.3.11
  - @assistant-ui/store@0.2.7
  - @assistant-ui/tap@0.5.8

## 0.1.10

### Patch Changes

- 376bb00: chore: update dependencies
- Updated dependencies [42bc640]
- Updated dependencies [376bb00]
- Updated dependencies [87e7761]
  - @assistant-ui/core@0.1.13
  - @assistant-ui/tap@0.5.7

## 0.1.9

### Patch Changes

- 6554892: feat: add useAssistantContext for dynamic context injection

  Register a callback-based context provider that injects computed text into the system prompt at evaluation time, ensuring the prompt always reflects current application state.

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
  - @assistant-ui/store@0.2.6
  - @assistant-ui/tap@0.5.6

## 0.1.8

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
  - @assistant-ui/store@0.2.5
  - @assistant-ui/tap@0.5.5

## 0.1.7

### Patch Changes

- 736344c: chore: update dependencies
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

## 0.1.6

### Patch Changes

- 7ecc497: feat: children API for primitives with part.toolUI, part.dataRendererUI, and MessagePrimitive.Quote
- Updated dependencies [7ecc497]
  - @assistant-ui/core@0.1.7

## 0.1.5

### Patch Changes

- 4a904de: refactor: remove useAssistantRuntime hook
- 349f3c7: chore: update deps
- 6cc4122: refactor: use primitive hooks
- 642bcda: Add `quote.tsx` registry components and `injectQuoteContext` helper
- Updated dependencies [1ed9867]
- Updated dependencies [427ffaa]
- Updated dependencies [349f3c7]
- Updated dependencies [02614aa]
- Updated dependencies [6cc4122]
- Updated dependencies [642bcda]
  - @assistant-ui/core@0.1.6
  - assistant-stream@0.3.6
  - @assistant-ui/store@0.2.3
  - @assistant-ui/tap@0.5.3

## 0.1.4

### Patch Changes

- 990e41d: refactor: code sharing between the multiple platforms
- Updated dependencies [990e41d]
  - @assistant-ui/core@0.1.5

## 0.1.3

### Patch Changes

- 8ed9d6f: Add optional `aui` parameter to AssistantRuntimeProvider for passing an AssistantClient
- 8ed9d6f: Refactor React Native component API: move shared runtime logic (remote thread list, external store, cloud adapters, message converter, tool invocations) into @assistant-ui/core for reuse across React and React Native
- Updated dependencies [5ae74fe]
- Updated dependencies [8ed9d6f]
- Updated dependencies [01bee2b]
  - @assistant-ui/core@0.1.3

## 0.1.2

### Patch Changes

- a845911: chore: update dependencies
- Updated dependencies [a845911]
  - @assistant-ui/store@0.2.2
  - @assistant-ui/tap@0.5.2

## 0.1.1

### Patch Changes

- 36ef3a2: chore: update dependencies
- c31c0fa: Extract shared React code (model-context, client, types, providers, RuntimeAdapter) into `@assistant-ui/core/react` sub-path so both `@assistant-ui/react` and `@assistant-ui/react-native` re-export from one source.
- 14769af: refactor: move RuntimeAdapter base logic to @assistant-ui/core; re-export missing core APIs from distribution packages
- f8abe87: feat(react-native): add attachment primitives and useComposerAddAttachment hook
- a638f05: refactor(react-native): import generic store utilities from @assistant-ui/store, remove deprecated hooks in favor of useAuiState
- d74d309: feat(react-native): add tool system, model context hooks, and data renderers
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
  - @assistant-ui/store@0.2.1
  - @assistant-ui/tap@0.5.1

## 0.1.0

### Minor Changes

- 124ae9f: feat(react-native): setup
- ef5d622: feat(react-native): integrate store system

### Patch Changes

- 9276547: fix: thread deletion crash "Entry not available in the store"
- f116f55: feat(react-native): use core's RemoteThreadList infrastructure
- Updated dependencies [b65428e]
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
- Updated dependencies [b65428e]
- Updated dependencies [61b54e9]
- Updated dependencies [4d7f712]
- Updated dependencies [ecc29ec]
- Updated dependencies [6e97999]
- Updated dependencies [b65428e]
- Updated dependencies [93910bd]
- Updated dependencies [60bbe53]
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
  - @assistant-ui/tap@0.5.0
  - @assistant-ui/store@0.2.0
  - @assistant-ui/core@0.1.0
  - assistant-stream@0.3.3
