---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

fix: append sent message optimistically so attachments stay visible during upload

Applies to `useLocalRuntime` only: the local runtime opts in via the internal `supportsOptimisticAttachmentSend` predicate. External-store and adapter runtimes keep the existing composer-lock behavior from #5112 unchanged.
