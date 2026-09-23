---
"@assistant-ui/core": patch
---

fix: merge a deep-linked thread's fetched metadata as an optimistic update, so an archive or delete that fails afterwards rolls back, a thread that initialized or was deleted or archived while the fetch was in flight keeps its current state, and one remote thread never gets two slots
