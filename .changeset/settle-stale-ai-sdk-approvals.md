---
"@assistant-ui/ai-sdk": patch
---

fix: cancel unanswered approvals once a later AI SDK message follows them, and store late tool results in their originating message without resuming the obsolete run. with `cancelPendingToolCallsOnSend: false` and `onRespondToToolApproval`, superseded approvals settle as cancelled. an idle joined message keeps its auto status when the last entry has an open tool call, and the last message keeps `running` during a run.
