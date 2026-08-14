---
"@assistant-ui/ai-sdk": patch
---

feat: `AISDKChat`, an `AuiConfig` entry that runs the AI SDK chat as the `threads` scope of any `AssistantClient` host, React or not. Single thread; multi-thread and assistant-cloud stay on `useChatRuntime`, which now shares the same orchestration internally.
