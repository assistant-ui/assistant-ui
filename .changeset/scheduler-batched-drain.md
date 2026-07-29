---
"@assistant-ui/tap": patch
---

fix: drain large update batches in a single flush instead of throwing and dropping pending updates

When more than 50 schedulers were dirty in one flush (e.g. hundreds of
resources mounting from a single bulk state update), the scheduler aborted
the flush and discarded the remaining dirty schedulers, leaving resources
permanently stale. A flush now drains the queue completely; bulk updates of
any size land in one batch. Infinite-loop detection no longer depends on
batch size: per-scheduler re-runs within a burst (> 50) catch resources
that re-dirty themselves or each other, and a burst-wide task cap (10000)
backstops unbounded cascades of fresh schedulers — so true update loops
throw "Maximum update depth exceeded" while finite batches of any realistic
size drain successfully.
