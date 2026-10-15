---
"@assistant-ui/store": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

`useAuiState` and `aui.composer.getState()` now see composer text as soon as `setText` returns, so an input that keeps its own state, such as react-mentions, no longer moves the caret to the end.
