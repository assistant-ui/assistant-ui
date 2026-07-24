---
"@assistant-ui/react-native": patch
---

feat: add ThreadPrimitive.MessagesFlatList with React Native auto-scroll behavior

`ThreadPrimitive.MessagesFlatList` is the canonical React Native message list with auto-scroll behavior enabled by default. `ThreadPrimitive.Messages` remains exported for backwards compatibility, delegates to the FlatList implementation, and is deprecated with its previous no-auto-scroll default preserved.
