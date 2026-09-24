---
"@assistant-ui/core": patch
---

fix(core): an external store runtime that switches threads through `adapters.threadList.threadId` builds the new thread from the current store, so the previous thread's messages no longer show up as a branch of the new one and a tool call in the new thread's history no longer executes on switch
