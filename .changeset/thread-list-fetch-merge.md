---
"@assistant-ui/core": patch
---

fix: merge a deep-linked thread's fetched metadata as an optimistic update, so an archive or delete that fails afterwards rolls back, a thread that initialized or was archived or deleted while the fetch was in flight keeps its current state as long as its slot id still resolves, and one remote thread never gets two slots
