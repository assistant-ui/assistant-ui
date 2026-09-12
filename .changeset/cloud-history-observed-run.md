---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
---

fix: report the error, error code and first token time of a run persisted in the `ai-sdk/v6` format; the runtime hands the cloud history adapter the thread message it persisted, whose status and timing complete a report the stored message cannot carry. the failed message's status error is now the `AssistantError` shape (`{ code, message }`, the code being the AI SDK error's `code` or its name) instead of the message string, and `first_token_ms` reads `firstTokenTime` as the duration the runtime records instead of subtracting the stream start, which also repairs the `aui/v0` path
