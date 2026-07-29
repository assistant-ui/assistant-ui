---
"@assistant-ui/tap": patch
---

fix: drain large update batches across multiple flush passes instead of throwing and dropping pending updates

When more than 50 schedulers are dirty in a single flush (e.g. hundreds of
resources mounting from one bulk state update), the scheduler aborted the
flush and discarded the remaining dirty schedulers, leaving resources
permanently stale. Flushes now process at most 50 tasks per pass and defer
the rest to a follow-up pass, and `flushTapSync` drains synchronously until
the queue is empty. Infinite-loop detection is based on per-scheduler
re-runs within a burst (> 50), so finite batches of any size drain
successfully while true update loops still throw "Maximum update depth
exceeded" immediately.
