---
"@assistant-ui/core": patch
"@assistant-ui/react-langgraph": patch
---

feat: `reloadMainThread()` prefers an in-place reload when the runtime declares `unstable_reloadThread` (via `ExternalStoreAdapter.onReloadThread`), falling back to remounting the runtime hook otherwise. `useLangGraphRuntime` registers the capability, so reloading re-runs `load()` without destroying the runtime — composer drafts survive and existing messages stay rendered while fresh state (including pending interrupts) is fetched.
