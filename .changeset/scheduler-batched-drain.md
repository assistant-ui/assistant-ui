---
"@assistant-ui/tap": patch
---

fix: drain large update batches in a single flush instead of throwing and dropping pending updates

When more than 50 schedulers were dirty in one flush (e.g. hundreds of
resources mounting from a single bulk state update), the scheduler aborted
the flush and discarded the remaining dirty schedulers, leaving resources
permanently stale. A flush now drains the queue completely, chunking
silently across macrotasks when a batch exceeds one pass (1000 tasks), so
bulk updates of any size land without errors. Infinite-loop detection no
longer depends on batch size: a per-scheduler re-run guard (> 50 runs in
one burst) drops just the offending scheduler and clears its dirty flag,
so a genuinely looping resource degrades once while the rest of the app
keeps flushing at full speed; a documented burst bound (5000 tasks, ~8x a
real 600-resource history page) reports a likely loop once but keeps
chunking, so even oversized finite batches complete. `createTapRoot` now
holds one UpdateScheduler per root (mirroring `useTapRoot`) so the guard
covers every root type.
