---
"@assistant-ui/core": patch
---

fix(core): log a failed `ThreadRuntime.append`, `ThreadRuntime.startRun`, `ThreadRuntime.resumeRun` or `MessageRuntime.reload` instead of leaving it to surface as an unhandled rejection
