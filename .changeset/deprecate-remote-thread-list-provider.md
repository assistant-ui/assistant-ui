---
"@assistant-ui/core": patch
---

deprecate `RemoteThreadListAdapter.unstable_Provider` for removal in a future minor release; `useRemoteThreadListRuntime` now warns in development when an adapter with it keeps the runtime on the class core. return the same adapters from `unstable_useAdapters` instead.
