---
"@assistant-ui/ai-sdk": patch
---

feat: add `unstable_enableMessageQueue` to the AI SDK runtimes, so a message sent during a run waits in `composer.queue` and is sent once the request settles, one request at a time. A steer stops the running response and sends once the stopped request has settled.
