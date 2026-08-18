---
"@assistant-ui/core": patch
"@assistant-ui/react-langchain": patch
---

fix: paint the first message of a new thread before initialization resolves. the local core inserts and notifies before awaiting the initialization barrier, rolling the optimistic message back and rejecting with `MessageNotSentError` when the barrier fails, and the external-store core no longer holds `onNew` on it. behavior change for custom external-store adapters under a remote thread list: `onNew` and `onEdit` can now run before the thread record exists, so a dispatch that needs the remote identity must `await threadListItem.initialize()` itself (the ai-sdk transport and langgraph already do, `useStreamRuntime` now does). appends that used to be silently dropped when the thread was stopped, unmounted, or switched away during the initialization wait now dispatch immediately instead; the invalidation guard still covers the tool-abort window. the queue path keeps the pre-enqueue barrier.
