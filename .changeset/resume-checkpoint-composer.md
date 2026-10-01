---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/ai-sdk": patch
---

Add adapter-owned `canResume` state, a `useComposerResume` hook in `@assistant-ui/core/react`, and a web `ComposerPrimitive.Resume` button. The composer offers Resume when it is idle and empty and an interrupted run has a checkpoint. The control stays disabled while reconnecting. The new state field is optional so existing custom thread clients remain compatible.

AI SDK manual reconnect requires `canResume: true` and a server that replays the full interrupted message with its original ID. Transient errors retain the checkpoint for retry; branch switches and new send, edit, or regeneration requests clear the previous checkpoint, including when a request fails before response headers arrive.

With opt-in, pending resume requests share one attempt per thread using the first call's configuration, even if the callback or configuration changes before it settles. A later retry uses the current callback and its own configuration. Without opt-in, existing resume calls keep their synchronous invocation and independent behavior.

Preserve the external-store adapter's callback receiver and release stale pending resumes at session, repository, and branch replacement boundaries without letting an older completion clear a newer attempt.
