---
"@assistant-ui/core": patch
"@assistant-ui/react-langgraph": patch
---

feat: `reloadMainThread()` prefers an in-place reload when the runtime declares `unstable_refetchThread` (via `ExternalStoreAdapter.onRefetchThread`), falling back to remounting the runtime hook otherwise. `useLangGraphRuntime` registers the capability, so reloading re-runs `load()` without destroying the runtime: composer drafts and LangGraph graph state (`values`) survive, existing messages stay rendered while fresh state (including pending interrupts) is fetched, and a refetch failure reaches the caller. A run that is still streaming is cancelled first on runtimes that support cancelling.

`react-google-adk` has the same remote session load path but does not register the capability, so `reloadMainThread()` there takes the remount fallback and discards unsent composer input. That divergence is deliberate for this release rather than resolved: adopting it needs verification against that adapter's own runtime, tracked in #5528.
