---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/ai-sdk": patch
---

Add explicit adapter-owned `canResume` state and a `useComposerResume` hook, with a web `ComposerPrimitive.Resume` button. Unsupported adapters retain the existing send/cancel behavior. The Resume control stays disabled while an external-store resume callback is pending. Existing resume calls retain synchronous adapter invocation and independent calls. With `canResume: true`, the runtimes coalesce identical pending requests; different run configurations still execute independently. The composer hook owns no duplicate pending state.

Resumable AI SDK transports expose the manual resume API only with `canResume: true`. This opt-in also clears checkpoints on branch switches and retains them after transient reconnect failures for manual retry. Without it, explicit resume support and branch callbacks keep their existing behavior. Automatic reconnect does not retry the same stream again during the mount.
