---
"@assistant-ui/react-langgraph": patch
---

fix: forward `threadId` and `initialThreadId` from `useLangGraphRuntime` to the underlying thread list runtime, so URL-based thread routing (`threadId` in, `onThreadIdChange` out) works with LangGraph the same way it does with the base runtime
