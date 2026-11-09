---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

store a running assistant message in Assistant Cloud as soon as its run starts so its run lease stays alive while the tab streams it; a reply whose tab closed mid-run now loads as an interrupted error instead of disappearing, and the new `ActionBarPrimitive.Resume` continues it in a new assistant message. A late write from the interrupted run lands on its own branch instead of overwriting the resumed reply. A reply another tab is still writing shows as in progress and follows the run live until it finishes or is interrupted; the new `ActionBarPrimitive.RefreshRun` re-reads it on demand. Messages carry `runState` (`"stale"` or `"in_progress"`), `ErrorPrimitive.Root` exposes it as `data-run-state` (with `role="status"` while in progress), and `ActionBarPrimitive.Root` with `hideWhenRunning` also hides while another tab writes the reply.
