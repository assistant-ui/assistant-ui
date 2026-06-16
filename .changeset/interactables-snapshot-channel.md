---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: add `unstable_` interactables API; restore and deprecate the previous interactables API

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
