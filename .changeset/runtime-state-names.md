---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: name the runtime state types `ThreadRuntimeState`, `MessageRuntimeState`, `ComposerRuntimeState`, `AttachmentRuntimeState` and `ThreadListItemRuntimeState`

these are the states `ThreadRuntime`, `MessageRuntime`, `ComposerRuntime`, `AttachmentRuntime` and `ThreadListItemRuntime` return from `getState()`, now exported by all three distributions; `@assistant-ui/react-native` and `@assistant-ui/react-ink` had no name for them. in `@assistant-ui/react`, `ThreadState`, `MessageState`, `ComposerState`, `AttachmentState` and `ThreadListItemState` still name these runtime states but are deprecated: from 0.16 they name the store states `useAuiState` reads, as they already do in `@assistant-ui/react-native` and `@assistant-ui/react-ink`. code that annotates a runtime's `getState()` result should move to the new names.
