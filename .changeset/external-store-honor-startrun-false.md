---
"@assistant-ui/react-ai-sdk": patch
---

fix: `aui.thread().append({ startRun: false })` no longer triggers a run on AI SDK runtime

`useAISDKRuntime`'s `onNew` and `onEdit` always called `chatHelpers.sendMessage`, ignoring `message.startRun`. The hook now appends the message via `chatHelpers.setMessages` (with a generated id when needed) and returns early when `startRun: false`, so the message lands in the chat without kicking off a model call.
