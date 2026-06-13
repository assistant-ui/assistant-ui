---
"@assistant-ui/react-ag-ui": patch
---

feat: forward the full ExternalStoreThreadListAdapter (threads, archivedThreads, onRename, onArchive, ...) through adapters.threadList so server-persisted threads can be registered and switched to; clear messages before onSwitchToThread so the previous thread's messages no longer merge in as a phantom sibling branch; onSwitchToThread can return unstable_resume to reattach to an in-flight run after switching (resumes in the background and requires a ThreadHistoryAdapter with resume(), otherwise it reports through onError instead of re-running the agent)
