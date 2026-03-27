---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"assistant-ui": patch
---

refactor: align interactables with codebase conventions

- Rename `useInteractable` to `useAssistantInteractable` (registration only, returns id)
- Add `useInteractableState` hook for reading/writing interactable state
- Remove `makeInteractable` and related types
- Rename `UseInteractableConfig` to `AssistantInteractableProps`
- Extract `buildInteractableModelContext` from `Interactables` resource
- Add `with-interactables` example to CLI
