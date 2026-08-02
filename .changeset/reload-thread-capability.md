---
"@assistant-ui/core": patch
---

feat: add the in-place refetch contract behind `threads.reloadMainThread()`. A runtime opts in with `unstable_refetchThread` on `ThreadRuntimeCore`, which an external store supplies through the new `ExternalStoreAdapter.onRefetchThread` (unrelated to `onReload`, which re-generates an assistant message) and which surfaces as `RuntimeCapabilities.refetchThread`, reporting which mechanism a call would take rather than whether it does anything. Runtimes that opt in keep their runtime identity, so composer drafts survive and messages stay rendered while the refetch runs; the rest fall back to remounting the runtime hook. Core does not stop a run in progress before calling the capability: doing that means `cancelRun`, whose contract is that the user abandoned a send, so it returns the trailing user message to the composer. An implementation owns whatever coordination a concurrent run needs.

The remount fallback needs the binder's React key to carry a generation, which changes it from `threadId` to `${threadId}:${generation}` for every `useRemoteThreadListRuntime` consumer rather than only for callers of the new method. One existing behaviour changes with it: a `stopThreadRuntime` followed by `startThreadRuntime` for the same id inside a single React commit used to reuse the mounted binder and now remounts it, so that binder no longer carries state from before the stop.

No adapter registers the capability yet, so every runtime takes the remount fallback for now. `react-langgraph` adoption is #5531 and `react-google-adk` is #5528.
