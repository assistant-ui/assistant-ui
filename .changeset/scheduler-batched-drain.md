---
"@assistant-ui/tap": patch
---

fix: drain large update batches in a single flush instead of throwing and dropping pending updates

When more than 50 schedulers were dirty in one flush (e.g. hundreds of
resources mounting from a single bulk state update), the scheduler aborted
the flush and discarded the remaining dirty schedulers, leaving resources
permanently stale. A flush now drains the queue completely, so bulk updates
land in one batch. Two loop guards, neither of which drops queued work: a
per-scheduler re-run guard (> 50 runs in one burst) drops the offending
scheduler so the rest of the queue keeps flushing, and a burst-wide task
cap (10000 tasks) silently yields and continues oversized batches on the
next macrotask — only MAX_CAP_STREAK (10) saturated flushes in a row are
treated as a runaway cascade, which throws "Maximum update depth exceeded"
and stops auto-continuing while keeping the queue intact.
