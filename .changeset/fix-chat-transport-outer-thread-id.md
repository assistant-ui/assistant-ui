---
"@assistant-ui/react-ai-sdk": patch
---

fix: request body `id` in `useChatRuntime` is now the real thread id instead of the literal `"DEFAULT_THREAD_ID"`. `AssistantChatTransport` was resolving `remoteId` from the inner `ExternalStoreThreadListRuntimeCore` (which only echoes its default id); it now uses the outer `RemoteThreadListRuntimeCore` that actually calls the adapter.
