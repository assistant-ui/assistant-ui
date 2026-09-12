---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
---

refactor: the cloud history adapter reports runs and engagement events through `assistant-cloud`'s reporters and reads AI SDK runs through `assistant-cloud/ai-sdk`; steps are now reported for a run with a single step as well, an error is reported once per run, a stored `ai-sdk/v6` run that produced tool calls without text reads completed instead of incomplete, and a run whose message carries a cancelled, length or content filter finish reports incomplete instead of completed
