---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

fix: `AssistantFrameProvider.dispose()` now tells the parent it is gone, so `AssistantFrameHost` rejects tool calls still waiting on the frame right away instead of after the 30 s timeout
