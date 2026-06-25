---
"@assistant-ui/react-langgraph": patch
---

feat: expose `useLangGraphSetMessages` to set/replace the runtime's message list

`useLangGraphRuntime` owned its LangChain message list internally with no way for consumers to modify it. This adds a `useLangGraphSetMessages` hook (mirroring `useLangGraphSend`) that surfaces the runtime's `setMessages`. It accepts an array or a functional updater, so consumers can implement history pagination (prepend an older page: `setMessages((prev) => [...older, ...prev])`) or optimistic edits while the thread is idle. It throws if called while a run is in progress, because the running stream owns the list during a turn; the next run re-seeds from the current list.
