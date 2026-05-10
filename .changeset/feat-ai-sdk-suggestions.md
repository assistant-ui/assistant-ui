---
"@assistant-ui/react-ai-sdk": patch
---

feat: expose `suggestions` on `useAISDKRuntime` and `useChatRuntime`

both hooks now accept an optional `suggestions: readonly ThreadSuggestion[]` option that is forwarded to the underlying `useExternalStoreRuntime`. this lets AI SDK callers drive follow up suggestions from application state, tool results, or backend responses without dropping down to the raw external store runtime.
