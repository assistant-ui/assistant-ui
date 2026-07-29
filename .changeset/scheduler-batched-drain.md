---
"@assistant-ui/tap": patch
---

fix: drain large update batches in a single flush instead of throwing and dropping pending updates

When more than 50 schedulers were dirty in one flush (e.g. hundreds of
resources mounting from a single bulk state update), the scheduler aborted
the flush and discarded the remaining dirty schedulers, leaving resources
permanently stale. A flush now drains the queue completely, chunking
silently across macrotasks when a batch exceeds one pass (1000 tasks), so
bulk updates of any size land without errors. The only remaining exception
is a per-scheduler re-run guard (> 50 runs in one burst), which drops just
the offending scheduler — left dirty on purpose, so its root never
publishes un-applied state and recovers on the next dispatch. A burst
saturating 20 consecutive passes logs a one-time console warning (a likely
loop) but keeps chunking, and an oversized `flushTapSync` batch defers its
remainder to the outer state instead of throwing.
