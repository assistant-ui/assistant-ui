---
"@assistant-ui/react": minor
"@assistant-ui/cloud": minor
---

feat: Add thread fetching capability to remote thread list adapter

- Add `fetch` method to `RemoteThreadListAdapter` interface
- Implement `fetch` in cloud adapter to retrieve individual threads
- Enhance `switchToThread` to automatically fetch and load threads not present in the current list
- Add `get` method to `AssistantCloudThreads` for individual thread retrieval
