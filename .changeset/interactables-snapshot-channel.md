---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: redesign the interactables API with message snapshots, one stable tool per name, a combined hook, and persistence `load`

Interactable state now reaches the model through a per-message snapshot stamped on the outgoing user message's `metadata.custom.interactables` instead of the system prompt, and is re-stamped only when the model doesn't already know the state (the model's own `update_*` calls count as known). `getInteractableSnapshots` and `formatInteractableSnapshot` are exported for non-AI-SDK integrations.

BREAKING CHANGES:

- `useAssistantInteractable` + `useInteractableState` are merged into a single `useInteractable(name, config)` hook that registers and returns `[state, { id, setState, isPending, error, flush }]`, with the state type inferred from `stateSchema`. `useInteractableState(id)` remains for secondary readers and returns `undefined` until the owner registers.

```diff
- const id = useAssistantInteractable("taskBoard", config);
- const [state, { setState }] = useInteractableState(id, initialState);
+ const [state, { setState }] = useInteractable("taskBoard", config);
```

- Each interactable name now gets exactly one `update_{name}` tool with a required `id` parameter, instead of per-instance `update_{name}_{id}` tools. Tool names, schemas, and descriptions no longer change as instances mount/unmount. A top-level `id` field in `stateSchema` is now reserved for instance addressing.

- The top-level `selected` prop on registration and the `setSelected` method have been removed. Model selection as ordinary state (a `selected` field in your `stateSchema`).

- The persistence adapter gains an optional `load()` and can be passed directly to the scope: `Interactables({ persistence: { load, save } })`. Loaded state seeds app-scoped interactables as they register; local edits win over a slow load.
