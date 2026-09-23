---
"@assistant-ui/ai-sdk": patch
---

feat: on the AI SDK runtime a recorded tool interaction shows on its tool call, is written to history at once (under `__aui_toolInteractions` in the stored copy's metadata, never in the chat's messages) and returns on reload
