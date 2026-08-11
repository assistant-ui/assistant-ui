---
"@assistant-ui/core": patch
---

fix: `cancelRun()` resyncs the current repository instead of a snapshot captured before the cancel. The deferred `updateMessages` lands a macrotask after the cancel, and a store that settles the cancelled turn and re-supplies its content in that gap had the older array written back over it — the settled turn painted, then reverted, returning only on reload. Re-reading at flush time keeps the resync (including committing a kept optimistic message) while letting anything that arrived in between stand.
