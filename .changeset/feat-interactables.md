---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: add interactables with partial updates, multi-instance, and selection

- `useInteractable(name, config)` hook and `makeInteractable` factory for registering AI-controllable UI
- `Interactables()` scope resource with auto-generated update tools and system prompt injection
- Partial updates — auto-generated tools use partial schemas so AI only sends changed fields
- Multi-instance support — same name with different IDs get separate `update_{name}_{id}` tools
- Selection — `setSelected(true)` marks an interactable as focused, surfaced as `(SELECTED)` in system prompt
