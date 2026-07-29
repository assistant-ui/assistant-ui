---
"@assistant-ui/tap": patch
---

fix: drain large update batches in a single flush instead of throwing and dropping pending updates

When more than 50 schedulers were dirty in one flush (e.g. hundreds of
resources mounting from a single bulk state update), the scheduler aborted
the flush and discarded the remaining dirty schedulers, leaving resources
permanently stale. A flush now drains the queue completely; bulk updates of
any size land in one batch. Two loop guards, both non-stalling: a
per-scheduler re-run guard (> 50 runs in one burst) drops the offending
scheduler so the rest of the queue keeps flushing, and a burst-wide task
cap (10000) backstops unbounded cascades of fresh schedulers by throwing
and rescheduling so the remainder continues on the next flush.
