---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

fix: append sent message optimistically so attachments stay visible during upload

Applies to `useLocalRuntime` only: the local runtime opts in via the internal `supportsOptimisticAttachmentSend` predicate. External-store and adapter runtimes keep the existing composer-lock behavior from #5112 unchanged.

Because the sent message now lands in the thread before its attachments finish uploading, the local runtime orders work behind that upload: a message appended during the upload renders immediately, but its history write and its run wait for the upload to settle, so the run sees a complete history. `cancelRun()` and `detach()` release that ordering, so a stalled upload cannot hold later appends indefinitely.
