---
"@assistant-ui/core": patch
---

In the external store thread runtime, evict a trailing user message when the host republishes it under a new id mid-run, so Stop does not write the stale client copy back beside the composer draft.
