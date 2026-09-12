---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
---

refactor: the cloud history adapter reports runs and engagement events through `assistant-cloud`'s reporters and reads AI SDK runs through `assistant-cloud/ai-sdk`; steps are now reported for a run with a single step as well, and an error is reported once per run
