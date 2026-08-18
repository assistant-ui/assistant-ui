---
"@assistant-ui/ai-sdk": patch
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: host assistant-cloud thread lists on AISDKThreads via RemoteThreadList

AISDKThreads({ cloud }) uses RemoteThreadList and remounts each thread like useChatRuntime. Cloud history withFormat resolves persistence per call so one adapter can serve many threads. useExternalHistory waits for threadListItem.remoteId instead of latching on the first empty paint.
