---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
---

a thread can open on its latest page and load older messages on demand: the external store adapter takes `hasEarlier` and `onLoadEarlier`, the runtime surfaces them as `thread.hasEarlier`, `thread.isLoadingEarlier` and `aui.thread.loadEarlier()` with one load in flight at a time, `ThreadPrimitive.LoadEarlier` loads the next page, `ThreadPrimitive.Viewport` keeps the visible messages in place when it lands above them, and the React Native `ThreadPrimitive.MessagesFlatList` pages through the runtime when it gets no `history` prop
