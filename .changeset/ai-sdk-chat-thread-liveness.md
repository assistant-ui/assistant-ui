---
"@assistant-ui/react-ai-sdk": patch
---

fix: forward `AISDKThreads` chat callbacks through a ref so a callback swapped on a later render fires, matching `useChat`, and default `stopOnClientDestroy` to `true`
