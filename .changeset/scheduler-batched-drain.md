---
"@assistant-ui/tap": patch
---

fix: drain large update batches in a single flush instead of throwing and dropping pending updates

When more than 50 schedulers were dirty in one flush (e.g. hundreds of
resources mounting from a single bulk state update), the scheduler aborted
the flush and discarded the remaining dirty schedulers, leaving resources
permanently stale. A flush now drains the queue completely, chunking
silently across macrotasks when a batch exceeds one pass (1000 tasks), so
bulk updates of any size land without errors. Infinite-loop detection: a
per-scheduler re-run guard (> 50 runs in one burst) drops just the
offending scheduler — left dirty on purpose, so its root never publishes
un-applied state and recovers on the next dispatch — and a runaway that
saturates 20 consecutive passes (only possible for fresh-instance
cascades, never for finite batches whose last pass is always partial)
throws "Maximum update depth exceeded" and stops auto-continuing.
`createTapRoot` now holds one UpdateScheduler per root (mirroring
`useTapRoot`) so the guard covers every root type.
