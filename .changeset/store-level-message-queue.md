---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: add a store level message queue so composer.send() buffers while the thread is running and flushes when it ends, with a queueWhileRunning opt in on ComposerPrimitive.Send (works on langgraph, external store, and local runtimes)
