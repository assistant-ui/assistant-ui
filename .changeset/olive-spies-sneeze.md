---
"@assistant-ui/store": patch
---

perf: keep a thread update off every message client

A streamed token no longer re-runs every message client in an external-store thread, cutting per-token cost by about 60% at 1000 messages.
