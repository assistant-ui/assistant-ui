---
"@assistant-ui/core": patch
"@assistant-ui/react-langchain": patch
---

fix: paint the first message of a new thread before initialization resolves. the local core inserts and notifies before awaiting the initialization barrier, rolling the optimistic message back when the barrier rejects or the thread is invalidated mid-wait, and the external-store core no longer holds `onNew` on it. dispatch seams that need the remote identity await `threadListItem.initialize()` themselves; the ai-sdk transport already does, and `useStreamRuntime` now does. the queue path keeps the pre-enqueue barrier.
