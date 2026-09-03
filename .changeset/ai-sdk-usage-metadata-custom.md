---
"@assistant-ui/ai-sdk": patch
---

fix: carry server `messageMetadata` through to the thread

metadata keys the UIMessage carries outside the thread metadata shape (`usage`, `modelId`, anything a route returns from `messageMetadata`) now land in `metadata.custom` instead of being dropped by the message normalizer, so `useThreadTokenUsage` and the context display report the usage the documented route emits.
