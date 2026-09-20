---
"@assistant-ui/store": patch
---

perf: keep a thread update off every message client

The assistant client host handed its tap context a fresh object on every render, which marked the context changed and took every resource that reads it down with it, so one streamed token re-ran every message client in the thread. The context value is now memoized, and a scope's state is resolved once per notification instead of once per consumer. A token in a 1000-message external-store thread costs about 60% less.
