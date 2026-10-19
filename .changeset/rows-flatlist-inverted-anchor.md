---
"@assistant-ui/react-native": patch
---

fix: keep an inverted `ThreadPrimitive.RowsFlatList` still while a reply streams when its newest row renders nothing, slide a message that lands at the bottom into view instead of snapping it there, and stop following new rows when `autoScroll` is `false`
