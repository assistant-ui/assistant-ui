---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/react-ag-ui": patch
---

Add explicit adapter-owned `canResume` state and a `useComposerResume` hook, with a web `ComposerPrimitive.Resume` button. Unsupported adapters retain the existing send/cancel behavior. The Resume control stays disabled while an external-store resume callback is pending. Explicit `resumeRun(config)` calls still invoke the adapter for each request and preserve its configuration.

For resumable AI SDK transports, branch switches and exhausted streams (HTTP 204 or 404) clear the matching checkpoint. A transient reconnect error calls `onResumeError` and keeps the checkpoint only when `canResume: true` enables manual retry; otherwise it clears the matching checkpoint. Automatic reconnect does not retry that stream again during the same mount.

AG-UI hosts can explicitly report checkpoint availability with `canResume`. Delayed AI SDK reconnect responses cannot overwrite or clear a replacement checkpoint, including successful streams with or without a stream ID header.
