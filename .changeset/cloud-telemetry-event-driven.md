---
"@assistant-ui/cloud-ai-sdk": patch
---

fix(cloud-ai-sdk): use ai sdk onFinish event for telemetry status instead of message-shape heuristic

`extractRunTelemetry` previously inferred run status by walking message parts and checking for a final text part. when an assistant message ended on an unresolved frontend tool call (e.g. `ask_user_questions`), the model's turn was reported as `status: "incomplete"` with empty `output_text`, and the per-`assistantMessageId` dedupe in `CloudTelemetryReporter` then locked that record so the later resubmission carrying the actual text never overwrote it.

`CloudChatCore` now forwards the ai sdk `onFinish` event (`finishReason`, `isAbort`, `isDisconnect`, `isError`) into `CloudTelemetryReporter.reportFromMessages`. status is derived from those signals; `length` / `content-filter` map to `incomplete`, `isError` / `finishReason: "error"` map to `error`, `stop` and terminal `tool-calls` map to `completed`. mid-loop checkpoints (`finishReason: "tool-calls"` with `lastAssistantMessageIsCompleteWithToolCalls` returning true) are skipped, so the dedupe slot stays open for the post-resubmit final state.

`extractRunTelemetry` now uses ai sdk's `isToolUIPart`, `isStaticToolUIPart`, `isReasoningUIPart`, and `getToolName` helpers in place of hand-rolled equivalents, and exposes a `hasReasoning` flag. `reportFromMessages`'s third `event` argument is optional, so existing callers that only pass `(threadId, messages)` keep their previous behavior.
