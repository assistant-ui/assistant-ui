---
"@assistant-ui/core": patch
"@assistant-ui/react-langgraph": patch
---

feat: `reloadMainThread()` prefers an in-place reload when the runtime declares `unstable_refetchThread` (via `ExternalStoreAdapter.onRefetchThread`), falling back to remounting the runtime hook otherwise. `useLangGraphRuntime` registers the capability, so reloading cancels any in-flight run, re-runs `load()` without destroying the runtime — composer drafts and LangGraph graph state (`values`) survive, existing messages stay rendered while fresh state (including pending interrupts) is fetched — and propagates refetch failure to the caller.

`react-google-adk` has a remote session load path but does not register the capability yet, so reloads there take the remount fallback; porting the same `onRefetchThread` wiring is a follow-up.
