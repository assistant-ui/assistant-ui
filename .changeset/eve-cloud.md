---
"@assistant-ui/eve": patch
---

feat: `useEveAgentRuntime` accepts `cloud`: Assistant Cloud backs the thread list, and each cloud thread keeps the eve session its first turn creates as its external id. a resuming session now reports `isLoading`, and a message sent during the replay waits for it instead of being refused
