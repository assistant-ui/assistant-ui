---
"@assistant-ui/core": patch
---

fix(core): stop `useRemoteThreadListRuntime` exposing threads a reload no longer lists through `getItemById`, `threadItems` and item actions, as the `RemoteThreadList` client already does
