---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
---

fix: report the error, error code and first token time of a run persisted in the `ai-sdk/v6` format; the runtime hands the cloud history adapter the thread message it persisted, whose status and timing complete a report the stored message cannot carry
