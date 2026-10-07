---
"@assistant-ui/core": patch
---

Keep local-storage thread deletion successful once metadata is removed even if history cleanup fails, preventing the client from restoring a thread whose later messages cannot be saved. Log cleanup failures and retry stale-history cleanup before reinitializing the same thread ID.
