---
"@assistant-ui/chat-test-kit-react": patch
---

feat: initial release of chat-test-kit-react (M2).

Adds `createChatTestHarness` (A-tier `waitForIdle/cancel` and C-tier `advanceChunk/advanceToolCall/inject.*`), the seven chat-aware matchers (`thread().on(harness).toHaveAssistantText`, `thread().toShowError`, `message(n).toHaveText`, `message(n).on(harness).toStreamCompletely`, `message(n).on(harness).toBeInterrupted`, `toolCall(name).toRenderResult`, `toolCall(name).on(harness).toHaveReceivedArgs`), and `setupChatTestKit()` for zero-config matcher registration. Drives a real `useLocalRuntime` via `@assistant-ui/react` public exports, and re-exports core transcript APIs so consumers only need to install `@assistant-ui/chat-test-kit-react`.
