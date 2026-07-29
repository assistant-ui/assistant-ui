---
"@assistant-ui/tap": patch
---

fix: drain large update batches in a single flush instead of throwing and dropping pending updates

When more than 50 schedulers were dirty in one flush (e.g. hundreds of
resources mounting from a single bulk state update), the scheduler aborted
the flush and discarded the remaining dirty schedulers, leaving resources
permanently stale. A flush now drains the queue completely, so bulk updates
of any size land in one batch. Infinite-loop detection no longer depends on
batch size: a per-scheduler re-run guard (> 50 runs in one flush) drops
just the offending scheduler, so self-re-dirtying resources and mutually
re-dirtying rings throw "Maximum update depth exceeded" while the rest of
the queue keeps flushing. `createTapRoot` now holds one UpdateScheduler
per root (mirroring `useTapRoot`) so the guard covers every root type.
