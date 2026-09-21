---
"@assistant-ui/ai-sdk": patch
"@assistant-ui/store": patch
---

fix: stop a nested `useChatRuntime` chat when its own component unmounts, stop registering `AISDKThreads` cloud threads on the client destroy signal, and keep the host destroy signal armed across fast refresh
