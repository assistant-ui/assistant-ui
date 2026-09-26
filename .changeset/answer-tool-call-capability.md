---
"@assistant-ui/core": patch
"@assistant-ui/react-ink": patch
---

feat: `RuntimeCapabilities.answerToolCall` reports whether a thread can answer a waiting tool call by adding its result, resuming it, or responding to its approval. a readonly thread reports `false`, a local thread `true`, and an external store `true` once it sets `onAddToolResult`, `onResumeToolCall`, or `onRespondToToolApproval`, or runs tools itself through `unstable_enableToolInvocations`; the react-ink `ToolFallback` shows a pending approval's prompt without its Allow and Deny controls where it is `false`
