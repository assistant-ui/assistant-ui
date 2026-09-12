---
"@assistant-ui/cloud-ai-sdk": patch
---

refactor: report runs and engagement events through `assistant-cloud`'s reporters and persist with the shared `aiSDKV6FormatAdapter`; a stop is reported for a run the hook saw start, with its elapsed time, and the run stays open across the continuation that `sendAutomaticallyWhen` submits
