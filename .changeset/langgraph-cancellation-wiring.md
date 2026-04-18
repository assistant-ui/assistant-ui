---
"@assistant-ui/react-langgraph": patch
---

feat: add `unstable_createLangGraphStream` helper that builds a `stream` callback for `useLangGraphRuntime` with `config.abortSignal` and `onDisconnect: "cancel"` wired to `client.runs.stream`.
