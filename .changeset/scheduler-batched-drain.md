---
"@assistant-ui/tap": patch
---

fix: drain large update batches in a single flush instead of throwing and dropping pending updates

When more than 50 schedulers were dirty in one flush (e.g. hundreds of
resources mounting from a single bulk state update), the scheduler aborted
the flush and discarded the remaining dirty schedulers, leaving resources
permanently stale. A flush now drains the queue completely, so bulk updates
land in one batch. Two loop guards: a per-scheduler re-run guard (> 50 runs
in one burst) drops the offending scheduler so the rest of the queue keeps
flushing, and a burst-wide task cap (10000 tasks) backstops unbounded
cascades of fresh schedulers — it reschedules so oversized batches continue
on the next flush, and after 10 consecutive saturated flushes it stops
auto-continuing (keeping, not dropping, the remainder) so a true runaway
terminates without ever losing queued updates.
