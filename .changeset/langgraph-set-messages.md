---
"@assistant-ui/react-langgraph": minor
---

feat: expose `useLangGraphSetMessages` to set/replace the runtime's message list

`useLangGraphRuntime` owned its LangChain message list internally with no way for consumers to modify it. This adds a `useLangGraphSetMessages` hook (mirroring `useLangGraphSend`) that surfaces the runtime's existing `setMessages`. It accepts an array or a functional updater, so consumers can implement history pagination (prepend an older page: `setMessages((prev) => [...older, ...prev])`) or optimistic edits. Later stream events continue to merge onto whatever is set, keyed by message id.
