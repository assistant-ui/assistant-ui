---
"@assistant-ui/react": minor
---

feat: `ThreadState`, `MessageState`, `ComposerState`, `AttachmentState` and `ThreadListItemState` name the store states

<!-- caret-break: intended -->

in `@assistant-ui/react` these five names now name the states `useAuiState` reads, the same types `@assistant-ui/react-native` and `@assistant-ui/react-ink` export under them. until now they named the runtime API states, deprecated during 0.15 in favor of `ThreadRuntimeState`, `MessageRuntimeState`, `ComposerRuntimeState`, `AttachmentRuntimeState` and `ThreadListItemRuntimeState`; code that annotates what a runtime's `getState()` returns moves to those names. the v0.16 migration guide lists the fields that differ.
