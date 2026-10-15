---
"@assistant-ui/ai-sdk": patch
"@assistant-ui/react-ai-sdk": patch
---

Add `unstable_enableMessageQueue` to the AI SDK runtimes. Messages sent during a run wait in `composer.queue`; steered messages run first after the current request and its client tools finish. Failed queued sends remain available for retry, and the runtime error hook exposes the failure.
