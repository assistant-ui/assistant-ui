---
"@assistant-ui/react": patch
---

fix: prevent duplicate tool call rendering and handle argsText reset gracefully

- Skip rendering duplicate `toolCallId` entries in message content to prevent duplicate tool call UIs during HITL flows
- Handle argsText reset from incomplete to complete JSON gracefully instead of throwing errors
