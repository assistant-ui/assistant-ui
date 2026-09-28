---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/react-ag-ui": patch
---

Add explicit adapter-owned `canResume` state and a `useComposerResume` hook, with a web `ComposerPrimitive.Resume` button. Unsupported adapters retain the existing send/cancel behavior. The Resume control stays disabled while an external-store resume callback is pending. Existing resume calls retain synchronous adapter invocation and independent calls. With `canResume: true`, the runtimes coalesce identical pending requests; different run configurations still execute independently. The composer hook owns no duplicate pending state.

For resumable AI SDK transports, branch switches and exhausted streams (HTTP 204 or 404) clear the matching checkpoint. A transient reconnect error calls `onResumeError` and keeps the checkpoint only when `canResume: true` enables manual retry; otherwise it clears the matching checkpoint. Automatic reconnect does not retry that stream again during the same mount.

AG-UI keeps its existing explicit run/interrupt/history APIs, but does not expose generic checkpoint availability: its default resume endpoint starts a new run rather than reconnecting a retained stream. Delayed AI SDK reconnect responses cannot overwrite or clear a replacement checkpoint, including successful streams with or without a stream ID header.
