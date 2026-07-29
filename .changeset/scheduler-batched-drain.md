---
"@assistant-ui/tap": patch
---

fix: drain large update batches in a single flush instead of throwing and dropping pending updates

When more than 50 schedulers were dirty in one flush (e.g. hundreds of
resources mounting from a single bulk state update), the scheduler aborted
the flush and discarded the remaining dirty schedulers, leaving resources
permanently stale. A flush now drains the queue completely; bulk updates of
any size land in one batch. Infinite-loop detection no longer depends on
batch size: it counts per-scheduler re-runs within a burst (> 50), so true
update loops throw "Maximum update depth exceeded" immediately while finite
batches of any size drain successfully.
