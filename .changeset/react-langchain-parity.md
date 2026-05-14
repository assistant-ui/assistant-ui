---
"@assistant-ui/react-langchain": patch
---

feat(react-langchain): parity options + send hooks (toward deprecating `react-langgraph`)

- Adds `autoCancelPendingToolCalls` (default `true`): when a new user
  message is submitted while previous tool calls are still pending,
  automatically submit `tool` messages cancelling them so the agent's
  tool-call accounting stays consistent.
- Adds `unstable_allowCancellation`: when set, surfaces a Cancel
  button that calls `useStream().stop()`. Off by default (mirrors the
  legacy `react-langgraph` behaviour).
- Adds `unstable_threadListAdapter`: custom `RemoteThreadListAdapter`
  override for self-hosted persistence (takes precedence over `cloud`).
- Adds `create` and `delete` options, forwarded to the underlying
  `useCloudThreadListAdapter`.
- Adds `useLangChainSend()` and `useLangChainSendCommand()` parity
  helpers for migrating away from `useLangGraphSend` /
  `useLangGraphSendCommand`.
