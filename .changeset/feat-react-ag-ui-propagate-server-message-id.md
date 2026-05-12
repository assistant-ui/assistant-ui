---
"@assistant-ui/react-ag-ui": patch
---

fix(react-ag-ui): adopt `TEXT_MESSAGE_START.messageId` as the assistant `ThreadMessage.id`

`AgUiThreadRuntimeCore` now inserts the assistant placeholder under an optimistic id (`generateOptimisticId`), then atomically reassigns the message id to the server-supplied `messageId` the first time `RunAggregator` observes one (on `TEXT_MESSAGE_START`, `TEXT_MESSAGE_CONTENT`, `TEXT_MESSAGE_END`, or `TOOL_CALL_START.parentMessageId`). `assistantHistoryParents` and `recordedHistoryIds` migrate with the id, so `persistAssistantHistory`, `addToolResult`, and downstream lookups keep working and resolve to the canonical AG-UI id. This brings the streaming path in line with `MESSAGES_SNAPSHOT` imports, which were already keyed on the server id.

`TOOL_CALL_RESULT.messageId` is now surfaced as `unstable_toolMessageId` on the tool-call part, so tool messages round-trip back to AG-UI with their original id instead of a synthetic `${toolCallId}:tool` value.
