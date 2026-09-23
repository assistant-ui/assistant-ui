---
"@assistant-ui/ai-sdk": patch
"@assistant-ui/store": patch
---

fix: stop a nested `useChatRuntime` chat when its own component unmounts, stop registering `AISDKThreads` cloud threads on the client destroy signal, and stop fast refresh from aborting the destroy signal of `useAui(config)` hosts
