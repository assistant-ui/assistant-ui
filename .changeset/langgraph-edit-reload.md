---
"@assistant-ui/react-langgraph": patch
---

feat(react-langgraph): add `onEdit` and `onReload` support via `getCheckpointId` option

Added `getCheckpointId` callback to `useLangGraphRuntime`. When provided, enables message editing (branching) and regeneration by resolving the appropriate LangGraph checkpoint ID for server-side forking. The checkpoint ID flows through to the `stream` callback via `LangGraphSendMessageConfig.checkpointId`.

Also fixed a stale closure bug in `useLangGraphMessages` where the message accumulator could initialize with outdated messages when `setMessages` and `sendMessage` were called in the same React frame.
