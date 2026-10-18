---
"@assistant-ui/ai-sdk": patch
---

fix: keep streams resumable when tool output or custom data contains a nested finish type. Clear the checkpoint only after a complete SSE event identifies itself as a finish event.
