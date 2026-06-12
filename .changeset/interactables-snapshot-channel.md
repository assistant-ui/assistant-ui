---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react-ai-sdk": patch
---

feat: redesign the interactables API with message snapshots, one stable tool per name, a combined hook, and persistence `load`

Interactable state now reaches the model through a per-message snapshot stamped on the outgoing user message's `metadata.custom.interactables` instead of the system prompt, and is stamped only when the model doesn't already know the state (the model's own `update_*` calls count as known, as do the args of the tool call that created an instance under the `id: toolCallId` convention). When a change fits a shallow merge, the snapshot carries only the changed fields (`partial: true`) instead of cloning the full state. `getInteractableSnapshots` and `formatInteractableSnapshot` are exported for non-AI-SDK integrations; custom snapshot wording must handle partial entries.

Thread-scoped interactables rendered inside tool-call message parts are version-aware: `useInteractable` always returns the live state, plus a `version` object for the rendering message — its state as of that point in the conversation, an `isLatest` flag, and a `restore()` back to it. Whether older messages render frozen history or stay live-editable is the component's choice. `interactableTool({ description, stateSchema, render })` defines the creating tool as a complete toolkit entry (the entry key is the interactable name), building the full in-message wiring from one render function — streaming previews and the tool UI for the auto-generated `update_{name}` tool included (available standalone as the `updateRender` config option). `useInteractableVersions(id, name)` (and the pure `getInteractableVersions`) lists every recorded version with `restore()`, for artifact-style version pickers. The `update_{name}` tool's success result now includes the resolved instance `id`, and an instance registered from several places stays registered until the last one unmounts.

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
