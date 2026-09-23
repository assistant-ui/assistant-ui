---
"@assistant-ui/ai-sdk": patch
"@assistant-ui/react-ai-sdk": patch
---

fix: `ai` (7.0.101 or newer) is now a peer dependency, so the adapter shares the app's `ai` and upgrading it no longer splits `assistant-cloud` into two copies whose `AssistantCloud` types reject each other
