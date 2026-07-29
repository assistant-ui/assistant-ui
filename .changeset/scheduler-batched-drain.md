---
"@assistant-ui/tap": patch
---

fix: drain large update batches in a single flush instead of throwing and dropping pending updates

When more than 50 schedulers were dirty in one flush (e.g. hundreds of
resources mounting from a single bulk state update), the scheduler aborted
the flush and discarded the remaining dirty schedulers, leaving resources
permanently stale. A flush now drains the queue completely, so bulk updates
land in one batch. Loop guards: a per-scheduler re-run guard (> 50 runs in
one burst) clears the queue so even mutually re-dirtying rings terminate,
and a burst-wide task cap (10000 tasks) silently yields oversized batches
onto the next macrotask — it only reports a runaway when the queue fails
to shrink across several cap aborts (a true cascade signature), so finite
batches of any size drain without errors and `flushTapSync` always lands
its whole batch before returning.
