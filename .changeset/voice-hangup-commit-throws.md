---
"@assistant-ui/core": patch
---

fix(core): end the voice session on hang up even when committing the unfinished reply throws; a synchronous voice commit failure is reported like a rejected one
