---
"@assistant-ui/core": patch
---

feat: add the in-place refetch contract behind `threads.reloadMainThread()`. A runtime opts in with `unstable_refetchThread` on `ThreadRuntimeCore`, which an external store supplies through the new `ExternalStoreAdapter.onRefetchThread` (unrelated to `onReload`, which re-generates an assistant message) and which surfaces as `RuntimeCapabilities.refetchThread` for a UI to gate on. Runtimes that opt in keep their runtime identity, so composer drafts survive and messages stay rendered while the refetch runs; the rest fall back to remounting the runtime hook. A run that is still streaming is cancelled first, on runtimes that both support cancelling and are actually running.

The remount fallback needs the binder's React key to carry a generation, which changes it from `threadId` to `${threadId}:${generation}` for every `useRemoteThreadListRuntime` consumer rather than only for callers of the new method. One existing behaviour changes with it: a `stopThreadRuntime` followed by `startThreadRuntime` for the same id inside a single React commit used to reuse the mounted binder and now remounts it, so that binder no longer carries state from before the stop.

No adapter registers the capability yet, so every runtime takes the remount fallback for now. `react-langgraph` adoption is #5531 and `react-google-adk` is #5528.
