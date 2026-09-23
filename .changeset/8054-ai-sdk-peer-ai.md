---
"@assistant-ui/ai-sdk": patch
---

fix(ai-sdk): reuse the host application's `ai` instance so `assistant-cloud` does not resolve against a separate copy
