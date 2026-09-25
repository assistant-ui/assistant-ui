---
"@assistant-ui/eve": patch
---

feat: `useEveAgentRuntime` accepts `cloud`: Assistant Cloud backs the thread list, and each cloud thread keeps the eve session its first turn creates as its external id, saved with `upsert` so a retried save cannot store a second thread. a resuming session now reports `isLoading`, and a message sent during the replay waits for it instead of being refused
