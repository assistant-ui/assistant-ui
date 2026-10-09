---
"@assistant-ui/core": patch
---

fix(core): stop `useRemoteThreadListRuntime` listing threads a reload no longer returns: they leave `threadItems` and list item actions reject them, as in the `RemoteThreadList` client, while a hidden thread whose runtime is still mounted stays readable through `getItemById`
