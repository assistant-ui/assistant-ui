---
"@assistant-ui/ai-sdk": patch
---

feat: keep cloud threads running across switches in AISDKThreads

The cloud thread list now opts into backgroundThreads: switching away no longer cancels an in-flight run (delete still stops it), every visited thread keeps its own mounted history, and new threads generate their titles automatically.
