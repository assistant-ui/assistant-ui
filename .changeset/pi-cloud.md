---
"@assistant-ui/react-pi": patch
---

feat: `usePiRuntime` accepts `cloud`: Assistant Cloud backs the thread list, and each cloud thread maps to a Pi thread; deleting a Pi thread that no longer exists succeeds, so its cloud thread can always be deleted
