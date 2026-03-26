# @assistant-ui/react-ink

## 0.0.8

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

## 0.0.7

### Patch Changes

- 3247231: feat(react-ink): add DiffPrimitive and DiffView for terminal diff rendering
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

## 0.0.6

### Patch Changes

- 7ecc497: feat: children API for primitives with part.toolUI, part.dataRendererUI, and MessagePrimitive.Quote
- 639792c: feat(react-ink): add ErrorPrimitive (Root, Message)
- Updated dependencies [7ecc497]
  - @assistant-ui/core@0.1.7

## 0.0.5

### Patch Changes

- 4a904de: refactor: remove useAssistantRuntime hook
- 349f3c7: chore: update deps
- 6cc4122: refactor: use primitive hooks
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

## 0.0.4

### Patch Changes

- f38a59b: Launch React Ink: add documentation, landing page, CLI --ink flag, and README
- 990e41d: refactor: code sharing between the multiple platforms
- Updated dependencies [990e41d]
  - @assistant-ui/core@0.1.5

## 0.0.3

### Patch Changes

- 6d78873: feat: add ToolFallback component with collapsible tool call visualization
- Updated dependencies [f032ea5]
- Updated dependencies [2828b67]
  - @assistant-ui/core@0.1.4
  - assistant-stream@0.3.5

## 0.0.2

### Patch Changes

- 8ed9d6f: Refactor React Native component API: move shared runtime logic (remote thread list, external store, cloud adapters, message converter, tool invocations) into @assistant-ui/core for reuse across React and React Native
- Updated dependencies [5ae74fe]
- Updated dependencies [8ed9d6f]
- Updated dependencies [01bee2b]
  - @assistant-ui/core@0.1.3
