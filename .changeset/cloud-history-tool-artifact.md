---
"@assistant-ui/core": patch
---

fix: keep a tool call's artifact and provider metadata in cloud history

the aui/v0 cloud encoder dropped both fields, so a thread reloaded from assistant-cloud lost them and a tool UI rendering its artifact came back empty.
