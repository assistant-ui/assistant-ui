---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/ai-sdk": patch
---

store a running assistant message in Assistant Cloud as soon as its run starts, so its run lease is heartbeated while the tab streams it, also in the background; a reply whose run went `staleAfter` (default 30 seconds, an option on `useCloudThreadListAdapter`) without a heartbeat now loads as an interrupted error instead of disappearing, and the new `ActionBarPrimitive.Resume` starts a new branch beside it, the same way Regenerate does, with its own lease. A reply another tab is still writing shows as in progress and follows the run live until it finishes or goes quiet; the new `ActionBarPrimitive.RefreshRun` re-reads it on demand, and a late run that beats again shows as in progress again. The AI SDK runtime (`withFormat` history) holds run leases too when each thread message maps to one AI SDK message, and shows the same states on load; `MessageFormatItem` gains `unstable_status` and `GenericThreadHistoryAdapter` gains `unstable_onReload` for this. Messages carry `runState` (`"stale"` or `"in-progress"`), `ErrorPrimitive.Root` exposes it as `data-run-state` (with `role="status"` while in progress), and `ActionBarPrimitive.Root` with `hideWhenRunning` also hides while another tab writes the reply.
