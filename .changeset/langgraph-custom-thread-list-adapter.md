---
"@assistant-ui/react-langgraph": patch
---

feat: add `unstable_threadListAdapter` option to `useLangGraphRuntime` for backing the thread list with a custom `RemoteThreadListAdapter` (e.g. one backed by `client.threads.search()`) without requiring assistant-cloud
