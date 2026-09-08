---
"@assistant-ui/ai-sdk": patch
"@assistant-ui/core": patch
"@assistant-ui/store": patch
---

fix(core): cancel a thread's in-flight request when its runtime is torn down

each thread the remote thread list hosts now owns a destroy signal that aborts when its runtime is stopped or restarted, and `useChatRuntime` stops the chat on it. deleting or detaching a thread, replacing the thread list with one that drops it, or restarting its runtime now cancels the request that thread had in flight instead of leaving it streaming into a runtime nothing reads. hiding a thread under `<Activity mode="hidden">` is a soft unmount and keeps streaming.
