---
"assistant-cloud": patch
"@assistant-ui/react": patch
---

feat: Add standalone AI SDK hooks for cloud persistence without assistant-ui

New `@assistant-ui/cloud-ai-sdk` package with `useCloudChat` and `useThreads` hooks. Wraps AI SDK's `useChat` with automatic message persistence, thread management, and auto-title generation.
