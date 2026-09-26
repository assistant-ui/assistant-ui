---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/ai-sdk": patch
---

Add explicit adapter-owned `canResume` state and a `useComposerResume` hook, with a web `ComposerPrimitive.Resume` button. Unsupported adapters retain the existing send/cancel behavior. Concurrent `resumeRun` calls on an external-store thread await the first attempt, so a later config is ignored until that attempt settles. The adapter callback starts in the next microtask, after pending state is published, and must settle to re-enable Resume.

For resumable AI SDK transports, branch switches and exhausted streams (HTTP 204 or 404) clear the matching checkpoint. A transient reconnect error calls `onResumeError` but keeps the checkpoint so the user can retry; automatic reconnect does not retry that stream again during the same mount.
