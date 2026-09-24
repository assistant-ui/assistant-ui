---
"@assistant-ui/react-pi": patch
---

feat: `usePiRuntime` accepts `cloud`: Assistant Cloud backs the thread list, and each cloud thread maps to a Pi thread; deleting a Pi thread that no longer exists succeeds, in the node client and in `createPiHttpClient`, which reads a 404 as gone, so its cloud thread can always be deleted; a cloud thread without a Pi thread opens empty and rejects a send instead of asking the Pi server for the cloud id
