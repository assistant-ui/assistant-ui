---
"@assistant-ui/ai-sdk": patch
---

fix: a frontend tool's artifact reaches its tool UI on the AI SDK runtime and survives a reload from history; the stored copy keeps it under `__aui_toolArtifacts` in message metadata, which is stripped on load and never sent to the server
