---
"assistant-cloud": patch
---

feat: Add standalone AI SDK hooks for cloud persistence without assistant-ui

New `assistant-cloud/ai-sdk` export with `useCloudChat` and `useThreads` hooks. Wraps AI SDK's `useChat` with automatic message persistence, thread management, and auto-title generation.
