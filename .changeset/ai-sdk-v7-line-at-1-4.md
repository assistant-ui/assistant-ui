---
"@assistant-ui/react-ai-sdk": minor
---

feat: formally open the AI SDK v7 line at 1.4. `1.3.41` shipped the v7 hard-dep switch as a patch inside the documented v6 line; from `1.4.0` the mapping is explicit: `^1.4` targets `ai@^7`, v6 users pin `1.3.40`, v5 users pin `1.1.21`.
