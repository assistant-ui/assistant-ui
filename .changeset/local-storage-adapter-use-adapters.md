---
"@assistant-ui/core": patch
---

refactor: `createLocalStorageAdapter` (and so `createFileStorageAdapter` in `@assistant-ui/react-ink`) no longer sets `unstable_Provider`, which only wrapped the adapters its `unstable_useAdapters` already returns, so `useRemoteThreadListRuntime` runs it on the `RemoteThreadList` store client like the cloud adapter. a `useRemoteThreadListRuntime` that mounts with it now ignores `unstable_Provider` on any later adapter, so give that adapter `unstable_useAdapters` to keep its per-thread history
