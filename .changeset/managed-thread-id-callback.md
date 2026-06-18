---
"@assistant-ui/core": patch
---

feat: add `onThreadIdChange` to the remote thread list runtime so `threadId` can be used as a managed/controlled value (e.g. synced to a URL). Only the settled remote ID is emitted; the transient optimistic local ID is never surfaced.
