---
"@assistant-ui/tap": patch
---

fix: drain large update batches across multiple flush passes instead of throwing and dropping pending updates

When more than 50 schedulers are dirty in a single flush (e.g. hundreds of
resources mounting from one bulk state update), the scheduler aborted the
flush and discarded the remaining dirty schedulers, leaving resources
permanently stale. Flushes now process at most 50 tasks per pass and defer
the rest to a follow-up pass; the "Maximum update depth exceeded" guard is
kept, but only fires after many consecutive saturated passes (a true
infinite update loop).
