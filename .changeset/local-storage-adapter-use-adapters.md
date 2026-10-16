---
"@assistant-ui/core": patch
---

refactor: `createLocalStorageAdapter` no longer sets `unstable_Provider`, which only wrapped the adapters its `unstable_useAdapters` already returns, so `useRemoteThreadListRuntime` runs it on the `RemoteThreadList` store client like the cloud adapter
