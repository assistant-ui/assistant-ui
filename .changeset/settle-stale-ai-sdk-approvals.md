---
"@assistant-ui/ai-sdk": patch
---

fix: cancel unanswered approvals once a later AI SDK message follows them, and store late tool results in their originating message without resuming the obsolete run. With `cancelPendingToolCallsOnSend: false` and `onRespondToToolApproval`, unanswered approvals on non-last messages now settle as cancelled instead of remaining answerable.
