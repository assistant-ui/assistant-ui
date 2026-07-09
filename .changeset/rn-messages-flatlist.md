---
"@assistant-ui/react-native": patch
---

feat: add ThreadPrimitive.MessagesFlatList with React Native auto-scroll behavior

`ThreadPrimitive.Messages` now uses this FlatList implementation and auto-scrolls by default. If you already manage message-list scrolling yourself, pass `autoScroll={false}` or disable the individual `scrollToBottomOn*` options.
