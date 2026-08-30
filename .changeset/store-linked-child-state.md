---
"@assistant-ui/store": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: expose child scope state (`thread.messages`, `message.parts`, `threads.main`, ...) as linked state that resolves lazily inside `useAuiState(selector)`; `getState()` and `useAuiState(scope)` return only the scope's own fields plus `thread.messageIds`
