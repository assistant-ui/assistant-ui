---
"@assistant-ui/core": patch
---

fix(core): log a failed controlled `threadId` switch in `useRemoteThreadListRuntime` instead of dropping it, as the `RemoteThreadList` client already does
