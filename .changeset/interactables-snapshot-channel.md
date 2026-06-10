---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: send interactable state via message snapshots instead of the system prompt, and add `scope: "app" | "thread"`

BREAKING CHANGE: the top-level `selected` prop on `useAssistantInteractable` and the `setSelected` method returned by `useInteractableState` have been removed. Selection is now modeled as ordinary interactable state, so it flows through the same snapshot, persistence, and `update_*` tool paths as every other field.

Migrate by moving the flag into your `stateSchema`/`initialState` and toggling it with `setState`:

```diff
  const noteInitialState = {
    title: "New Note",
    content: "",
+   selected: false,
  };

- const id = useAssistantInteractable("note", { ...config, selected: isFocused });
- const [state, { setSelected }] = useInteractableState(id, noteInitialState);
- setSelected(true);
+ const id = useAssistantInteractable("note", config);
+ const [state, { setState }] = useInteractableState(id, noteInitialState);
+ setState((prev) => ({ ...prev, selected: true }));
```
