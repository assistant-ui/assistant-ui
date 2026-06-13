---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react-ai-sdk": patch
---

feat: redesign interactables around a single `useInteractable` hook and stable update tools

The interactables API has been simplified for building editable, in-message UI:

- `useInteractable(name, config)` now registers an interactable and returns its state plus methods in one hook.
- Each interactable name now has one stable `update_{name}` tool. When multiple instances share a name, the tool targets an instance by `id`.
- Thread-scoped interactables rendered inside message parts now expose `version`, including the state for that message, whether it is the latest tool-driven version, and `restore()`.
- Added `interactableTool(...)` for defining a creating tool and its in-message render UI together.
- Added `useInteractableVersions(id, name)` for version history UIs.
- Persistence adapters can now provide `load()` and be passed directly to `Interactables({ persistence })`.

BREAKING CHANGES:

- `useAssistantInteractable` was removed. Use `useInteractable(name, config)` instead:

```diff
- const id = useAssistantInteractable("taskBoard", config);
- const [state, { setState }] = useInteractableState(id, initialState);
+ const [state, { id, setState }] = useInteractable("taskBoard", config);
```

- `useInteractableState(id)` remains available for secondary readers, but returns `undefined` until the owner registers.
- Per-instance update tools like `update_{name}_{id}` were replaced by one `update_{name}` tool with an `id` parameter.
- A top-level `id` field in `stateSchema` is reserved for instance addressing. Rename domain state fields to `itemId`, `recordId`, etc. if the model should edit them.
- The old top-level `selected` registration prop and `setSelected` method were removed. Model selection should be represented as ordinary state.
