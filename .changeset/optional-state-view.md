---
"@assistant-ui/store": patch
---

feat: optional state view — `s.optional.<scope>` resolves to `undefined` when the scope is unavailable instead of throwing, so `useAuiState((s) => s.optional.threadListItem?.remoteId)` works outside a thread list item. The base state stays non-optional and keeps throwing on unavailable scopes.
