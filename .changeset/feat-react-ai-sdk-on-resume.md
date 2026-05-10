---
"@assistant-ui/react-ai-sdk": patch
---

feat(react-ai-sdk): expose `onResume` on `useAISDKRuntime` and `useChatRuntime`

`AISDKRuntimeAdapter` and `UseChatRuntimeOptions` now accept `onResume`, which is forwarded to the underlying `useExternalStoreRuntime` adapter. `runtime.thread.resumeRun(config)` previously threw `"Runtime does not support resuming runs."` because the inner adapter literal omitted the field; consumers had to monkey-patch `runtime.thread.__internal_threadBinding.getState().resumeRun` to bridge their own replay channels (e.g. SSE reconnect endpoints keyed by turn id). This is a thin pass-through; the existing transport-level resume on `AssistantChatTransport` (auto-fired by `useChatRuntime` on mount) is unchanged and complementary.
